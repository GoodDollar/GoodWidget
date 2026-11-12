import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { Bytes } from './crypto/encoding.ts'
import { deriveAccountKey } from './crypto/prfDerivation.ts'
import { createInitialFlowState, passkeyFlowReducer, type PasskeyFlowState } from './flow/passkeyFlowMachine.ts'
import {
  prepareAccountBackup,
  restoreAccountFromProvider,
  uploadPreparedBackup,
  type PreparedBackup,
  type RestoredAccount,
} from './flow/passkeyOperations.ts'
import { readRememberedProviderId, rememberProviderId } from './storage/rememberedProvider.ts'
import { authenticateWithPasskey, createPasskey, isPasskeyPrfSupported } from './webauthn/passkeyClient.ts'
import { PASSKEY_ERROR_MESSAGES, PasskeyFlowError, toPasskeyFlowError } from './webauthn/passkeyErrors.ts'
import type {
  HexString,
  PasskeyBackupStorage,
  PasskeyErrorCode,
  PasskeyLoginWidgetProps,
  PasskeyProviderId,
} from './widgetRuntimeContract.ts'

/** A provider as shown on the B2 / C1 tiles. */
export interface PasskeyProviderOption {
  id: PasskeyProviderId
  label: string
}

export interface PasskeyLoginAdapterActions {
  /** A1 "Continue with passkey". */
  startLogin: () => void
  /** D2 "Create new account" -> A3. */
  requestNewAccount: () => void
  /** A3 "Create new account" -> A4. */
  confirmNewAccount: () => void
  /** B1 "Set up passkey backup" -> A4. */
  startBackup: () => void
  /** B2 "Continue" / C1 tile press. */
  chooseProvider: (providerId: PasskeyProviderId) => void
  /** D2 "Retry", D4 "Try again", D5 "Retry", D6 "Try again". */
  retry: () => void
  /** D3 "Try the other provider", D4 "Choose another provider". */
  chooseOtherProvider: () => void
  /** D3 / D6 "Back". */
  goBack: () => void
  /** B4 / C3 "Continue": hands the result to the host. */
  finish: () => void
  /** "Use another login method", "Back to login methods", "Not now", "Skip for now". */
  skip: () => void
}

export interface PasskeyLoginAdapterResult {
  flowState: PasskeyFlowState
  providerOptions: PasskeyProviderOption[]
  /** Provider preselected on B2: the remembered one, else the first offered. */
  preselectedProviderId: PasskeyProviderId | null
  actions: PasskeyLoginAdapterActions
}

/**
 * Secrets of the running flow. They live in a ref, never in React state or props, and are
 * dropped as soon as the user leaves the flow or hands the result to the host.
 */
interface PasskeyFlowSecrets {
  prfOutput: Bytes | null
  /** Account key created for a new user; only released through `onLogin` once the backup exists. */
  newAccountPrivateKey: HexString | null
  /** Encrypted backup, kept so D5 "Retry" does not need a new passkey prompt. */
  preparedBackup: PreparedBackup | null
  restoredAccount: RestoredAccount | null
}

const EMPTY_SECRETS: PasskeyFlowSecrets = {
  prfOutput: null,
  newAccountPrivateKey: null,
  preparedBackup: null,
  restoredAccount: null,
}

/** Provider that needs no choice screen: the only one offered, or else the remembered one. */
function pickKnownProviderId(
  providers: PasskeyBackupStorage[],
  rememberedProviderId: PasskeyProviderId | null,
  useRemembered: boolean,
): PasskeyProviderId | null {
  if (providers.length === 1) {
    return providers[0].id
  }
  return useRemembered ? rememberedProviderId : null
}

/**
 * Runs the passkey flow: owns the screen state machine, performs the WebAuthn / crypto / storage
 * work of each screen, and reports results to the host through the callbacks.
 */
export function usePasskeyLoginAdapter(props: PasskeyLoginWidgetProps): PasskeyLoginAdapterResult {
  const { storage, rpId, appName, privateKey: existingUserPrivateKey } = props
  const isExistingUser = existingUserPrivateKey !== undefined

  const [flowState, dispatch] = useReducer(
    passkeyFlowReducer,
    { isExistingUser, hasMultipleProviders: storage.length > 1 },
    createInitialFlowState,
  )

  // Callbacks and inputs are read through refs so the screen work always sees the latest props
  const latestPropsRef = useRef(props)
  latestPropsRef.current = props
  const secretsRef = useRef<PasskeyFlowSecrets>({ ...EMPTY_SECRETS })
  const startedAttemptRef = useRef<number | null>(null)
  const supportCheckStartedRef = useRef(false)

  const reportFailure = useCallback((error: unknown, fallbackCode: PasskeyErrorCode) => {
    const flowError = toPasskeyFlowError(error, fallbackCode)
    // Only the error kind and, for browser-generated DOMExceptions, their message: never anything that could hold key material
    console.error(
      `[passkey-login-widget] ${flowError.code}: ${error instanceof DOMException ? `${error.name}: ${error.message}` : (error as Error | undefined)?.name}`,
    )
    dispatch({ type: 'FAILED', errorCode: flowError.code })
    latestPropsRef.current.onError?.({ code: flowError.code, message: flowError.message })
  }, [])

  const findProvider = useCallback((providerId: PasskeyProviderId | null): PasskeyBackupStorage => {
    const provider = latestPropsRef.current.storage.find((candidate) => candidate.id === providerId)
    if (!provider) {
      throw new PasskeyFlowError('PROVIDER_AUTH_FAILED', PASSKEY_ERROR_MESSAGES.PROVIDER_AUTH_FAILED)
    }
    return provider
  }, [])

  /** A2: ask for an existing passkey, then restore from the known provider or ask which one. */
  const verifyExistingPasskey = useCallback(async () => {
    try {
      const { prfOutput } = await authenticateWithPasskey(rpId)
      secretsRef.current.prfOutput = prfOutput
      const knownProviderId = pickKnownProviderId(
        latestPropsRef.current.storage,
        readRememberedProviderId(latestPropsRef.current.storage),
        true,
      )
      dispatch({ type: 'PASSKEY_VERIFIED', providerId: knownProviderId })
    } catch (error) {
      reportFailure(error, 'PASSKEY_CANCELLED')
    }
  }, [reportFailure, rpId])

  /** C2: find, read and decrypt the backup of the verified passkey. */
  const restoreFromProvider = useCallback(
    async (providerId: PasskeyProviderId | null) => {
      try {
        const provider = findProvider(providerId)
        const { prfOutput } = secretsRef.current
        // Restoring without a verified passkey means the passkey step has to be done again
        if (!prfOutput) {
          throw new PasskeyFlowError('PASSKEY_CANCELLED', PASSKEY_ERROR_MESSAGES.PASSKEY_CANCELLED)
        }
        secretsRef.current.restoredAccount = await restoreAccountFromProvider({
          provider,
          prfOutput,
          rpId,
          onBackupFound: () => dispatch({ type: 'PROGRESS_ADVANCED' }),
        })
        rememberProviderId(provider.id)
        dispatch({ type: 'RESTORE_SUCCEEDED' })
      } catch (error) {
        reportFailure(error, 'PROVIDER_AUTH_FAILED')
      }
    },
    [findProvider, reportFailure, rpId],
  )

  /** A4: create a fresh passkey, make (or take) the account key and encrypt it for the backup. */
  const createPasskeyAndEncryptKey = useCallback(
    async (isNewAccount: boolean) => {
      // No backup has been attempted on A4, so a failure here must never surface as BACKUP_FAILED (D5):
      // until the passkey exists an unknown failure is a failed passkey request, afterwards a failed key preparation
      let unknownFailureCode: PasskeyErrorCode = 'PASSKEY_CANCELLED'
      try {
        const { prfOutput } = await createPasskey({ rpId, appName })
        unknownFailureCode = 'UNSUPPORTED_BROWSER'
        secretsRef.current.prfOutput = prfOutput
        dispatch({ type: 'PROGRESS_ADVANCED' })

        // Existing users keep their own key; only a new account gets a key derived from the passkey
        const accountPrivateKey = isNewAccount
          ? await deriveAccountKey(prfOutput)
          : (latestPropsRef.current.privateKey as HexString)
        secretsRef.current.newAccountPrivateKey = isNewAccount ? accountPrivateKey : null
        dispatch({ type: 'PROGRESS_ADVANCED' })

        secretsRef.current.preparedBackup = await prepareAccountBackup({
          privateKey: accountPrivateKey,
          prfOutput,
          rpId,
        })
        dispatch({ type: 'PROGRESS_ADVANCED' })

        const knownProviderId = pickKnownProviderId(
          latestPropsRef.current.storage,
          readRememberedProviderId(latestPropsRef.current.storage),
          false,
        )
        dispatch({ type: 'PASSKEY_CREATED', providerId: knownProviderId })
      } catch (error) {
        reportFailure(error, unknownFailureCode)
      }
    },
    [appName, reportFailure, rpId],
  )

  /** B3: upload the prepared (already encrypted) backup. */
  const uploadBackup = useCallback(
    async (providerId: PasskeyProviderId | null) => {
      try {
        const provider = findProvider(providerId)
        const { preparedBackup } = secretsRef.current
        // Nothing to upload means the passkey step never completed: it must be redone, not reported as a failed backup
        if (!preparedBackup) {
          throw new PasskeyFlowError('PASSKEY_CANCELLED', PASSKEY_ERROR_MESSAGES.PASSKEY_CANCELLED)
        }
        await uploadPreparedBackup(provider, preparedBackup)
        rememberProviderId(provider.id)
        dispatch({ type: 'BACKUP_SUCCEEDED' })
      } catch (error) {
        reportFailure(error, 'BACKUP_FAILED')
      }
    },
    [findProvider, reportFailure],
  )

  // The work of a screen starts once per screen entry (attempt), never on plain re-renders
  useEffect(() => {
    if (startedAttemptRef.current === flowState.attempt) {
      return
    }
    startedAttemptRef.current = flowState.attempt

    switch (flowState.screen) {
      case 'A1_ENTRY':
      case 'B1_BACKUP_PROMPT':
        // Back at the start of the journey: nothing of the previous attempt is kept
        secretsRef.current = { ...EMPTY_SECRETS }
        break
      case 'A2_AUTHENTICATING':
        void verifyExistingPasskey()
        break
      case 'C2_RESTORE_PROGRESS':
        void restoreFromProvider(flowState.providerId)
        break
      case 'A4_CREATE_PASSKEY':
        void createPasskeyAndEncryptKey(flowState.flowKind === 'new-account')
        break
      case 'B3_BACKUP_PROGRESS':
        void uploadBackup(flowState.providerId)
        break
      default:
        break
    }
  }, [createPasskeyAndEncryptKey, flowState, restoreFromProvider, uploadBackup, verifyExistingPasskey])

  // Browsers without WebAuthn / PRF go straight to D1
  useEffect(() => {
    if (supportCheckStartedRef.current) {
      return
    }
    supportCheckStartedRef.current = true
    void isPasskeyPrfSupported().then((isSupported) => {
      if (!isSupported) {
        reportFailure(
          new PasskeyFlowError('UNSUPPORTED_BROWSER', PASSKEY_ERROR_MESSAGES.UNSUPPORTED_BROWSER),
          'UNSUPPORTED_BROWSER',
        )
      }
    })
  }, [reportFailure])

  const finish = useCallback(() => {
    const { onLogin, onBackupComplete } = latestPropsRef.current
    const { restoredAccount, newAccountPrivateKey, preparedBackup } = secretsRef.current

    if (flowState.screen === 'C3_RESTORE_SUCCESS' && restoredAccount) {
      onLogin?.({ ...restoredAccount, isNewAccount: false })
    }
    if (flowState.screen === 'B4_BACKUP_SUCCESS' && preparedBackup && flowState.providerId) {
      if (flowState.flowKind === 'new-account' && newAccountPrivateKey) {
        onLogin?.({ privateKey: newAccountPrivateKey, address: preparedBackup.address, isNewAccount: true })
      }
      onBackupComplete?.({ address: preparedBackup.address, provider: flowState.providerId })
    }
    // The result has been handed over; nothing secret stays inside the widget
    secretsRef.current = { ...EMPTY_SECRETS }
  }, [flowState.flowKind, flowState.providerId, flowState.screen])

  const skip = useCallback(() => {
    secretsRef.current = { ...EMPTY_SECRETS }
    latestPropsRef.current.onSkip?.()
  }, [])

  const actions: PasskeyLoginAdapterActions = {
    startLogin: () => dispatch({ type: 'LOGIN_STARTED' }),
    requestNewAccount: () => dispatch({ type: 'NEW_ACCOUNT_REQUESTED' }),
    confirmNewAccount: () => dispatch({ type: 'NEW_ACCOUNT_CONFIRMED' }),
    startBackup: () => dispatch({ type: 'BACKUP_REQUESTED' }),
    chooseProvider: (providerId) => dispatch({ type: 'PROVIDER_CHOSEN', providerId }),
    retry: () => dispatch({ type: 'RETRY_REQUESTED' }),
    chooseOtherProvider: () => dispatch({ type: 'OTHER_PROVIDER_REQUESTED' }),
    goBack: () => dispatch({ type: 'BACK_REQUESTED' }),
    finish,
    skip,
  }

  const providerOptions = storage.map(({ id, label }) => ({ id, label }))
  const preselectedProviderId = readRememberedProviderId(storage) ?? storage[0]?.id ?? null

  return { flowState, providerOptions, preselectedProviderId, actions }
}
