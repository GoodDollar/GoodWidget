import type { Bytes } from '../crypto/encoding.ts'
import { PRF_SALT_TEXT } from '../crypto/prfDerivation.ts'
import { PASSKEY_ERROR_MESSAGES, PasskeyFlowError, toWebAuthnStepError, type WebAuthnStep } from './passkeyErrors.ts'

const PRF_SALT = new TextEncoder().encode(PRF_SALT_TEXT)

/** ES256 and RS256: what every platform authenticator supports. */
const SUPPORTED_SIGNATURE_ALGORITHMS: PublicKeyCredentialParameters[] = [
  { type: 'public-key', alg: -7 },
  { type: 'public-key', alg: -257 },
]

export interface CreatePasskeyOptions {
  rpId: string
  appName: string
  /** Passkey created by an earlier attempt that still needs its PRF output read (see `createPasskey`). */
  resumeCredentialId?: ArrayBuffer
  /** Called with the id of a newly created passkey, before its PRF support is checked. */
  onCredentialCreated?: (credentialId: ArrayBuffer) => void
}

export interface PasskeyPrfResult {
  /** Secret PRF output. Keep in memory only; never log, store or return to the host. */
  prfOutput: Bytes
}

/**
 * Whether this browser can run the flow. WebAuthn + (when the browser can tell) the PRF extension.
 * Browsers without `getClientCapabilities` are confirmed at registration instead.
 */
export async function isPasskeyPrfSupported(): Promise<boolean> {
  if (typeof PublicKeyCredential === 'undefined' || !navigator.credentials) {
    return false
  }
  const getClientCapabilities = (
    PublicKeyCredential as unknown as { getClientCapabilities?: () => Promise<Record<string, boolean>> }
  ).getClientCapabilities
  if (typeof getClientCapabilities !== 'function') {
    return true
  }
  const capabilities = await getClientCapabilities.call(PublicKeyCredential)
  return capabilities['extension:prf'] !== false
}

/** Minimal shape of the document's Permissions Policy API; Chromium only ships it under its old name `featurePolicy`. */
interface PermissionsPolicyApi {
  allowsFeature(feature: string): boolean
  features(): string[]
}

const WEBAUTHN_PERMISSIONS_POLICY_FEATURES = ['publickey-credentials-get', 'publickey-credentials-create']

/**
 * Finds the WebAuthn Permissions Policy features this document is not allowed to use.
 * A cross-origin iframe has none unless its embedder delegates them, and the browser then rejects every
 * `create()` / `get()` with a NotAllowedError and no dialog, which looks exactly like a cancelled request.
 * Browsers without that API (e.g. Safari) or that do not know a feature report nothing blocked; the rejected
 * request's own message is then the only hint (see `PasskeyFlowError.diagnostic`).
 */
export function findBlockedWebAuthnFeatures(): string[] {
  const policyDocument = document as unknown as { permissionsPolicy?: PermissionsPolicyApi; featurePolicy?: PermissionsPolicyApi }
  const permissionsPolicy = policyDocument.permissionsPolicy ?? policyDocument.featurePolicy
  if (!permissionsPolicy) {
    return []
  }
  const knownFeatures = permissionsPolicy.features()
  return WEBAUTHN_PERMISSIONS_POLICY_FEATURES.filter(
    (feature) => knownFeatures.includes(feature) && !permissionsPolicy.allowsFeature(feature),
  )
}

/** The `prf` entry of a credential's client extension results (WebAuthn Level 3). */
interface PrfExtensionResults {
  enabled?: boolean
  results?: { first?: BufferSource }
}

/** Client extension results of a credential; `undefined` `prf` means the browser or provider did not report the extension at all. */
function readPrfExtensionResults(credential: PublicKeyCredential): { prf?: PrfExtensionResults; reportedExtensions: string[] } {
  const extensionResults = credential.getClientExtensionResults() as { prf?: PrfExtensionResults }
  return { prf: extensionResults.prf, reportedExtensions: Object.keys(extensionResults) }
}

/** Reads `prf.results.first` from a credential's extension results; null when the authenticator gave none. */
function readPrfOutput(prf: PrfExtensionResults | undefined): Bytes | null {
  const first = prf?.results?.first
  if (!first) {
    return null
  }
  // Copy out of the view so offsets of a larger underlying buffer are not leaked into the result
  return ArrayBuffer.isView(first)
    ? new Uint8Array(first.buffer.slice(first.byteOffset, first.byteOffset + first.byteLength))
    : new Uint8Array(first)
}

/** D1 error for a provider that cannot give a PRF output; `reason` says which step noticed and what was missing. */
function createPrfUnsupportedError(step: WebAuthnStep, reason: string): PasskeyFlowError {
  return new PasskeyFlowError('UNSUPPORTED_BROWSER', PASSKEY_ERROR_MESSAGES.UNSUPPORTED_BROWSER, `${step}: ${reason}`)
}

/**
 * Asks for a discoverable passkey of this rpId and returns its PRF output.
 * @param rpId         relying party id
 * @param step         which flow step asks (named in the diagnostic of every failure)
 * @param credentialId limit the request to this credential (used right after creating a passkey)
 */
async function requestPrfAssertion(rpId: string, step: 'get' | 'prf-followup-get', credentialId?: ArrayBuffer): Promise<PasskeyPrfResult> {
  // After registration the user did not start this prompt themselves, so dismissing it is a failure, not a cancellation
  const isDismissalPossible = step === 'get'
  let assertion: PublicKeyCredential | null
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        rpId,
        // No server: the challenge only has to be fresh. The assertion itself is never verified.
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        userVerification: 'required',
        allowCredentials: credentialId ? [{ type: 'public-key', id: credentialId }] : [],
        extensions: { prf: { eval: { first: PRF_SALT } } } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null
  } catch (error) {
    throw toWebAuthnStepError(step, error, isDismissalPossible)
  }
  if (!assertion) {
    throw new PasskeyFlowError('PASSKEY_CANCELLED', PASSKEY_ERROR_MESSAGES.PASSKEY_CANCELLED, `${step}: the request resolved with no credential`)
  }
  let prfOutput: Bytes | null
  let reportedExtensions: string[]
  try {
    const extensionResults = readPrfExtensionResults(assertion)
    prfOutput = readPrfOutput(extensionResults.prf)
    reportedExtensions = extensionResults.reportedExtensions
  } catch (error) {
    throw toWebAuthnStepError(step, error, false)
  }
  if (!prfOutput) {
    throw createPrfUnsupportedError(step, `the passkey provider returned no PRF result (extension results: [${reportedExtensions.join(', ')}])`)
  }
  return { prfOutput }
}

/** Asks the user for an existing discoverable passkey of this rpId and returns its PRF output. */
export async function authenticateWithPasskey(rpId: string): Promise<PasskeyPrfResult> {
  return requestPrfAssertion(rpId, 'get')
}

/** Calls `navigator.credentials.create()` for a new discoverable passkey with the given PRF extension input. */
async function createCredential(
  { rpId, appName }: CreatePasskeyOptions,
  prfExtension: Record<string, unknown>,
): Promise<PublicKeyCredential | null> {
  const accountLabel = `${appName} ${new Date().toISOString().slice(0, 10)}`
  return (await navigator.credentials.create({
    publicKey: {
      rp: { id: rpId, name: appName },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: accountLabel, displayName: accountLabel },
      // No server: the challenge only has to be fresh. The attestation is never verified.
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: SUPPORTED_SIGNATURE_ALGORITHMS,
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      extensions: { prf: prfExtension } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null
}

/**
 * Creates the passkey. Asks for the PRF output right away (`prf.eval`); when the provider rejects that with an
 * error that is neither a dismissal nor "unsupported", retries once asking only to enable PRF, which every
 * PRF-capable provider accepts, and the output is then read by the follow-up assertion.
 */
async function createCredentialWithPrf(options: CreatePasskeyOptions): Promise<PublicKeyCredential | null> {
  try {
    return await createCredential(options, { eval: { first: PRF_SALT } })
  } catch (error) {
    const firstAttemptError = toWebAuthnStepError('create', error)
    if (firstAttemptError.code !== 'PASSKEY_FAILED') {
      throw firstAttemptError
    }
    try {
      return await createCredential(options, {})
    } catch (retryError) {
      const retryFailure = toWebAuthnStepError('create-prf-enable-only', retryError)
      retryFailure.diagnostic = `${retryFailure.diagnostic} (after ${firstAttemptError.diagnostic})`
      throw retryFailure
    }
  }
}

/**
 * Creates a NEW discoverable passkey and returns its PRF output.
 * When the authenticator only reports `prf.enabled` at registration, a follow-up assertion fetches the output.
 * When the provider reports no PRF support, D1 is raised; the passkey itself has been saved by then and stays in the
 * provider until the user deletes it.
 * @param options.resumeCredentialId  a passkey created by an earlier attempt whose PRF output could not be read:
 *                                    only the follow-up assertion is repeated, no second passkey is created
 * @param options.onCredentialCreated receives the id of the new passkey as soon as it exists
 */
export async function createPasskey(options: CreatePasskeyOptions): Promise<PasskeyPrfResult> {
  const { rpId, resumeCredentialId, onCredentialCreated } = options
  if (resumeCredentialId) {
    return requestPrfAssertion(rpId, 'prf-followup-get', resumeCredentialId)
  }
  let credential: PublicKeyCredential | null
  try {
    credential = await createCredentialWithPrf(options)
  } catch (error) {
    throw toWebAuthnStepError('create', error)
  }
  if (!credential) {
    throw new PasskeyFlowError('PASSKEY_CANCELLED', PASSKEY_ERROR_MESSAGES.PASSKEY_CANCELLED, 'create: the request resolved with no credential')
  }
  onCredentialCreated?.(credential.rawId)

  let prfExtension: PrfExtensionResults | undefined
  let reportedExtensions: string[]
  try {
    const extensionResults = readPrfExtensionResults(credential)
    prfExtension = extensionResults.prf
    reportedExtensions = extensionResults.reportedExtensions
  } catch (error) {
    throw toWebAuthnStepError('prf-missing', error, false)
  }
  const prfOutputAtRegistration = readPrfOutput(prfExtension)
  if (prfOutputAtRegistration) {
    return { prfOutput: prfOutputAtRegistration }
  }
  if (!prfExtension?.enabled) {
    throw createPrfUnsupportedError(
      'prf-missing',
      `the new passkey does not report PRF support (extension results: [${reportedExtensions.join(', ')}], prf.enabled: ${String(prfExtension?.enabled)}); the passkey stays saved in the provider and can be deleted there`,
    )
  }
  return requestPrfAssertion(rpId, 'prf-followup-get', credential.rawId)
}
