import type { PasskeyErrorCode, PasskeyProviderId, PasskeyScreenId } from '../widgetRuntimeContract.ts'

/**
 * Pure state machine for the screens of the passkey flow (A1-D6).
 * It holds no secrets: the PRF output and private keys live in the adapter, outside React state.
 */

/** Which journey is running; decides where the recovery buttons of the D screens lead. */
export type PasskeyFlowKind =
  | 'login' // returning user restoring an account with an existing passkey
  | 'new-account' // new user: fresh passkey, fresh account, first backup
  | 'backup' // existing (already logged in) user backing up their account

export interface PasskeyFlowState {
  screen: PasskeyScreenId
  flowKind: PasskeyFlowKind
  /** The host passed a `privateKey`: the widget starts in the backup flow and D5 may be skipped. */
  isExistingUser: boolean
  /** More than one backup provider is offered, so provider choice screens (B2/C1) and "other provider" buttons exist. */
  hasMultipleProviders: boolean
  providerId: PasskeyProviderId | null
  /** Index of the active step on the A4/B3/C2 progress screens. */
  progressStepIndex: number
  /**
   * Counts screen entries. The adapter starts the work of a screen once per attempt, so retrying
   * a screen re-runs its work and a re-render (or React strict-mode effect replay) does not.
   */
  attempt: number
  /** Set on D screens: the failure that led there. */
  errorCode: PasskeyErrorCode | null
  /** Screen that was running when the failure happened; D4/D5/D6 "retry" returns to it. */
  failedScreen: PasskeyScreenId | null
}

export type PasskeyFlowEvent =
  | { type: 'LOGIN_STARTED' } // A1 "Continue with passkey" -> A2
  | { type: 'PASSKEY_VERIFIED'; providerId: PasskeyProviderId | null } // A2 -> C2 (provider known) or C1
  | { type: 'NEW_ACCOUNT_REQUESTED' } // D2 -> A3
  | { type: 'NEW_ACCOUNT_CONFIRMED' } // A3 -> A4
  | { type: 'BACKUP_REQUESTED' } // B1 -> A4 (fresh passkey)
  | { type: 'PASSKEY_CREATED'; providerId: PasskeyProviderId | null } // A4 -> B3 (provider known) or B2
  | { type: 'PROVIDER_CHOSEN'; providerId: PasskeyProviderId } // C1 -> C2, B2 -> B3
  | { type: 'PROGRESS_ADVANCED' } // next step on A4/B3/C2
  | { type: 'RESTORE_SUCCEEDED' } // C2 -> C3
  | { type: 'BACKUP_SUCCEEDED' } // B3 -> B4
  | { type: 'FAILED'; errorCode: PasskeyErrorCode } // any working screen -> D1..D6
  | { type: 'RETRY_REQUESTED' } // D2 "Retry", D4 "Try again", D5 "Retry", D6 "Try again"
  | { type: 'OTHER_PROVIDER_REQUESTED' } // D3/D4 "other provider" -> C1 or B2
  | { type: 'BACK_REQUESTED' } // D3/D6 "Back" -> A1 (or B1 for existing users)

export function createInitialFlowState(options: {
  isExistingUser: boolean
  hasMultipleProviders: boolean
}): PasskeyFlowState {
  return {
    screen: options.isExistingUser ? 'B1_BACKUP_PROMPT' : 'A1_ENTRY',
    flowKind: options.isExistingUser ? 'backup' : 'login',
    isExistingUser: options.isExistingUser,
    hasMultipleProviders: options.hasMultipleProviders,
    providerId: null,
    progressStepIndex: 0,
    attempt: 0,
    errorCode: null,
    failedScreen: null,
  }
}

/** Screen that shows which error. AMBIGUOUS_BACKUP shares the D6 layout. */
const ERROR_SCREEN_BY_CODE: Record<PasskeyErrorCode, PasskeyScreenId> = {
  UNSUPPORTED_BROWSER: 'D1_UNSUPPORTED_BROWSER',
  PASSKEY_CANCELLED: 'D2_PASSKEY_CANCELLED',
  BACKUP_NOT_FOUND: 'D3_BACKUP_NOT_FOUND',
  PROVIDER_AUTH_FAILED: 'D4_PROVIDER_AUTH_FAILED',
  BACKUP_FAILED: 'D5_BACKUP_FAILED',
  DECRYPT_FAILED: 'D6_DECRYPT_FAILED',
  AMBIGUOUS_BACKUP: 'D6_DECRYPT_FAILED',
}

/** First screen of the journey, used by D2 "Retry" and the D3/D6 "Back" buttons. */
function entryScreenOf(state: PasskeyFlowState): PasskeyScreenId {
  return state.isExistingUser ? 'B1_BACKUP_PROMPT' : 'A1_ENTRY'
}

/** Provider choice screen for the current journey: C1 when restoring, B2 when backing up. */
function providerChoiceScreenOf(state: PasskeyFlowState): PasskeyScreenId {
  return state.flowKind === 'login' ? 'C1_RESTORE_PROVIDER' : 'B2_BACKUP_PROVIDER'
}

/**
 * Step that is active when a progress screen is entered. B3 starts at "Uploading" and C2 at
 * "Backup found" (searching), because the earlier steps already happened on the previous screens.
 */
const INITIAL_PROGRESS_STEP_BY_SCREEN: Partial<Record<PasskeyScreenId, number>> = {
  B3_BACKUP_PROGRESS: 2,
  C2_RESTORE_PROGRESS: 1,
}

/** Moves to a screen and resets the per-screen progress and error fields. */
function goToScreen(
  state: PasskeyFlowState,
  screen: PasskeyScreenId,
  changes: Partial<PasskeyFlowState> = {},
): PasskeyFlowState {
  return {
    ...state,
    screen,
    progressStepIndex: INITIAL_PROGRESS_STEP_BY_SCREEN[screen] ?? 0,
    attempt: state.attempt + 1,
    errorCode: null,
    failedScreen: null,
    ...changes,
  }
}

export function passkeyFlowReducer(state: PasskeyFlowState, event: PasskeyFlowEvent): PasskeyFlowState {
  switch (event.type) {
    case 'LOGIN_STARTED':
      return goToScreen(state, 'A2_AUTHENTICATING', { flowKind: 'login' })

    case 'PASSKEY_VERIFIED':
      // The provider is known when it was remembered or only one is offered: skip C1
      return event.providerId
        ? goToScreen(state, 'C2_RESTORE_PROGRESS', { providerId: event.providerId })
        : goToScreen(state, 'C1_RESTORE_PROVIDER')

    case 'NEW_ACCOUNT_REQUESTED':
      return goToScreen(state, 'A3_NEW_ACCOUNT_WARNING', { flowKind: 'new-account' })

    case 'NEW_ACCOUNT_CONFIRMED':
      return goToScreen(state, 'A4_CREATE_PASSKEY', { flowKind: 'new-account' })

    case 'BACKUP_REQUESTED':
      return goToScreen(state, 'A4_CREATE_PASSKEY', { flowKind: 'backup' })

    case 'PASSKEY_CREATED':
      // B2 is skipped only when a single provider is offered; with several the remembered one is just preselected
      return event.providerId
        ? goToScreen(state, 'B3_BACKUP_PROGRESS', { providerId: event.providerId })
        : goToScreen(state, 'B2_BACKUP_PROVIDER')

    case 'PROVIDER_CHOSEN':
      return goToScreen(
        state,
        state.flowKind === 'login' ? 'C2_RESTORE_PROGRESS' : 'B3_BACKUP_PROGRESS',
        { providerId: event.providerId },
      )

    case 'PROGRESS_ADVANCED':
      return { ...state, progressStepIndex: state.progressStepIndex + 1 }

    case 'RESTORE_SUCCEEDED':
      return goToScreen(state, 'C3_RESTORE_SUCCESS')

    case 'BACKUP_SUCCEEDED':
      return goToScreen(state, 'B4_BACKUP_SUCCESS')

    case 'FAILED':
      return {
        ...state,
        screen: ERROR_SCREEN_BY_CODE[event.errorCode],
        errorCode: event.errorCode,
        failedScreen: state.screen,
        attempt: state.attempt + 1,
        progressStepIndex: 0,
      }

    case 'RETRY_REQUESTED':
      // D2 starts over; D4/D5/D6 re-run the step that failed
      if (state.screen === 'D2_PASSKEY_CANCELLED') {
        return goToScreen(state, entryScreenOf(state), { flowKind: state.isExistingUser ? 'backup' : 'login' })
      }
      return goToScreen(state, state.failedScreen ?? entryScreenOf(state))

    case 'OTHER_PROVIDER_REQUESTED':
      return goToScreen(state, providerChoiceScreenOf(state), { providerId: null })

    case 'BACK_REQUESTED':
      return goToScreen(state, entryScreenOf(state), { flowKind: state.isExistingUser ? 'backup' : 'login' })

    default:
      return state
  }
}
