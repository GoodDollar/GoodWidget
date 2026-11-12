import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createInitialFlowState,
  passkeyFlowReducer,
  type PasskeyFlowEvent,
  type PasskeyFlowState,
} from './passkeyFlowMachine.ts'

/** Applies events in order and returns the screens visited after each one. */
function runEvents(initialState: PasskeyFlowState, events: PasskeyFlowEvent[]) {
  const states = [initialState]
  for (const event of events) {
    states.push(passkeyFlowReducer(states[states.length - 1], event))
  }
  return { finalState: states[states.length - 1], screens: states.map((state) => state.screen) }
}

const newUserState = createInitialFlowState({ isExistingUser: false, hasMultipleProviders: true })
const existingUserState = createInitialFlowState({ isExistingUser: true, hasMultipleProviders: true })

describe('passkey flow machine', () => {
  it('starts at A1 for a new visitor and at B1 for an existing user', () => {
    assert.equal(newUserState.screen, 'A1_ENTRY')
    assert.equal(existingUserState.screen, 'B1_BACKUP_PROMPT')
  })

  it('logs in: A1 -> A2 -> C1 -> C2 -> C3 when no provider is known', () => {
    const { screens } = runEvents(newUserState, [
      { type: 'LOGIN_STARTED' },
      { type: 'PASSKEY_VERIFIED', providerId: null },
      { type: 'PROVIDER_CHOSEN', providerId: 'icloud' },
      { type: 'RESTORE_SUCCEEDED' },
    ])
    assert.deepEqual(screens, ['A1_ENTRY', 'A2_AUTHENTICATING', 'C1_RESTORE_PROVIDER', 'C2_RESTORE_PROGRESS', 'C3_RESTORE_SUCCESS'])
  })

  it('skips C1 when the provider is remembered or the only one', () => {
    const { screens, finalState } = runEvents(newUserState, [
      { type: 'LOGIN_STARTED' },
      { type: 'PASSKEY_VERIFIED', providerId: 'google-drive' },
    ])
    assert.deepEqual(screens, ['A1_ENTRY', 'A2_AUTHENTICATING', 'C2_RESTORE_PROGRESS'])
    assert.equal(finalState.providerId, 'google-drive')
  })

  it('starts the restore progress at "Backup found" and advances to "Decrypting"', () => {
    const { finalState } = runEvents(newUserState, [
      { type: 'LOGIN_STARTED' },
      { type: 'PASSKEY_VERIFIED', providerId: 'google-drive' },
    ])
    assert.equal(finalState.progressStepIndex, 1)
    assert.equal(passkeyFlowReducer(finalState, { type: 'PROGRESS_ADVANCED' }).progressStepIndex, 2)
  })

  it('creates a new account: A1 -> A2 -> D2 -> A3 -> A4 -> B2 -> B3 -> B4', () => {
    const { screens, finalState } = runEvents(newUserState, [
      { type: 'LOGIN_STARTED' },
      { type: 'FAILED', errorCode: 'PASSKEY_CANCELLED' },
      { type: 'NEW_ACCOUNT_REQUESTED' },
      { type: 'NEW_ACCOUNT_CONFIRMED' },
      { type: 'PASSKEY_CREATED', providerId: null },
      { type: 'PROVIDER_CHOSEN', providerId: 'google-drive' },
      { type: 'BACKUP_SUCCEEDED' },
    ])
    assert.deepEqual(screens, [
      'A1_ENTRY',
      'A2_AUTHENTICATING',
      'D2_PASSKEY_CANCELLED',
      'A3_NEW_ACCOUNT_WARNING',
      'A4_CREATE_PASSKEY',
      'B2_BACKUP_PROVIDER',
      'B3_BACKUP_PROGRESS',
      'B4_BACKUP_SUCCESS',
    ])
    assert.equal(finalState.flowKind, 'new-account')
  })

  it('skips B2 only when a single provider is offered', () => {
    const { screens } = runEvents(newUserState, [
      { type: 'NEW_ACCOUNT_CONFIRMED' },
      { type: 'PASSKEY_CREATED', providerId: 'google-drive' },
    ])
    assert.deepEqual(screens, ['A1_ENTRY', 'A4_CREATE_PASSKEY', 'B3_BACKUP_PROGRESS'])
  })

  it('backs up an existing user with a fresh passkey: B1 -> A4 -> B2 -> B3 -> B4', () => {
    const { screens, finalState } = runEvents(existingUserState, [
      { type: 'BACKUP_REQUESTED' },
      { type: 'PASSKEY_CREATED', providerId: null },
      { type: 'PROVIDER_CHOSEN', providerId: 'icloud' },
      { type: 'BACKUP_SUCCEEDED' },
    ])
    assert.deepEqual(screens, ['B1_BACKUP_PROMPT', 'A4_CREATE_PASSKEY', 'B2_BACKUP_PROVIDER', 'B3_BACKUP_PROGRESS', 'B4_BACKUP_SUCCESS'])
    assert.equal(finalState.flowKind, 'backup')
  })

  it('starts the backup progress at "Uploading"', () => {
    const { finalState } = runEvents(existingUserState, [
      { type: 'BACKUP_REQUESTED' },
      { type: 'PASSKEY_CREATED', providerId: 'icloud' },
    ])
    assert.equal(finalState.progressStepIndex, 2)
  })

  it('maps every error code to its screen, AMBIGUOUS_BACKUP sharing D6, PASSKEY_FAILED sharing D2', () => {
    const expectedScreens = {
      UNSUPPORTED_BROWSER: 'D1_UNSUPPORTED_BROWSER',
      PASSKEY_CANCELLED: 'D2_PASSKEY_CANCELLED',
      PASSKEY_FAILED: 'D2_PASSKEY_CANCELLED',
      BACKUP_NOT_FOUND: 'D3_BACKUP_NOT_FOUND',
      PROVIDER_AUTH_FAILED: 'D4_PROVIDER_AUTH_FAILED',
      BACKUP_FAILED: 'D5_BACKUP_FAILED',
      DECRYPT_FAILED: 'D6_DECRYPT_FAILED',
      AMBIGUOUS_BACKUP: 'D6_DECRYPT_FAILED',
    } as const
    for (const [errorCode, expectedScreen] of Object.entries(expectedScreens)) {
      const failedState = passkeyFlowReducer(newUserState, {
        type: 'FAILED',
        errorCode: errorCode as keyof typeof expectedScreens,
      })
      assert.equal(failedState.screen, expectedScreen)
      assert.equal(failedState.errorCode, errorCode)
    }
  })

  it('D2 Retry starts over at A1 (B1 for existing users)', () => {
    const cancelledNewUser = runEvents(newUserState, [{ type: 'LOGIN_STARTED' }, { type: 'FAILED', errorCode: 'PASSKEY_CANCELLED' }, { type: 'RETRY_REQUESTED' }])
    assert.equal(cancelledNewUser.finalState.screen, 'A1_ENTRY')
    const cancelledExistingUser = runEvents(existingUserState, [{ type: 'BACKUP_REQUESTED' }, { type: 'FAILED', errorCode: 'PASSKEY_CANCELLED' }, { type: 'RETRY_REQUESTED' }])
    assert.equal(cancelledExistingUser.finalState.screen, 'B1_BACKUP_PROMPT')
  })

  it('a failed passkey request (PASSKEY_FAILED) shares the D2 layout but Retry re-runs the step that failed', () => {
    const failedCreate = runEvents(newUserState, [
      { type: 'NEW_ACCOUNT_CONFIRMED' },
      { type: 'FAILED', errorCode: 'PASSKEY_FAILED' },
    ])
    assert.equal(failedCreate.finalState.screen, 'D2_PASSKEY_CANCELLED')
    assert.equal(failedCreate.finalState.failedScreen, 'A4_CREATE_PASSKEY')
    assert.equal(passkeyFlowReducer(failedCreate.finalState, { type: 'RETRY_REQUESTED' }).screen, 'A4_CREATE_PASSKEY')

    const failedLogin = runEvents(newUserState, [{ type: 'LOGIN_STARTED' }, { type: 'FAILED', errorCode: 'PASSKEY_FAILED' }])
    assert.equal(passkeyFlowReducer(failedLogin.finalState, { type: 'RETRY_REQUESTED' }).screen, 'A2_AUTHENTICATING')
  })

  it('D4 / D5 / D6 Retry re-runs the screen that failed, keeping the provider', () => {
    const restoreFailed = runEvents(newUserState, [
      { type: 'LOGIN_STARTED' },
      { type: 'PASSKEY_VERIFIED', providerId: 'icloud' },
      { type: 'FAILED', errorCode: 'DECRYPT_FAILED' },
      { type: 'RETRY_REQUESTED' },
    ])
    assert.equal(restoreFailed.finalState.screen, 'C2_RESTORE_PROGRESS')
    assert.equal(restoreFailed.finalState.providerId, 'icloud')

    const backupFailed = runEvents(newUserState, [
      { type: 'NEW_ACCOUNT_CONFIRMED' },
      { type: 'PASSKEY_CREATED', providerId: 'google-drive' },
      { type: 'FAILED', errorCode: 'BACKUP_FAILED' },
      { type: 'RETRY_REQUESTED' },
    ])
    assert.equal(backupFailed.finalState.screen, 'B3_BACKUP_PROGRESS')
    assert.equal(backupFailed.finalState.errorCode, null)
  })

  it('counts every retry as a new attempt so the screen work runs again', () => {
    const failedState = runEvents(newUserState, [
      { type: 'LOGIN_STARTED' },
      { type: 'PASSKEY_VERIFIED', providerId: 'icloud' },
      { type: 'FAILED', errorCode: 'PROVIDER_AUTH_FAILED' },
    ]).finalState
    const retriedState = passkeyFlowReducer(failedState, { type: 'RETRY_REQUESTED' })
    assert.ok(retriedState.attempt > failedState.attempt)
    assert.equal(passkeyFlowReducer(retriedState, { type: 'PROGRESS_ADVANCED' }).attempt, retriedState.attempt)
  })

  it('"other provider" leads to C1 when restoring and to B2 when backing up', () => {
    const restoring = runEvents(newUserState, [
      { type: 'LOGIN_STARTED' },
      { type: 'PASSKEY_VERIFIED', providerId: 'google-drive' },
      { type: 'FAILED', errorCode: 'BACKUP_NOT_FOUND' },
      { type: 'OTHER_PROVIDER_REQUESTED' },
    ])
    assert.equal(restoring.finalState.screen, 'C1_RESTORE_PROVIDER')
    assert.equal(restoring.finalState.providerId, null)

    const backingUp = runEvents(existingUserState, [
      { type: 'BACKUP_REQUESTED' },
      { type: 'PASSKEY_CREATED', providerId: 'google-drive' },
      { type: 'FAILED', errorCode: 'PROVIDER_AUTH_FAILED' },
      { type: 'OTHER_PROVIDER_REQUESTED' },
    ])
    assert.equal(backingUp.finalState.screen, 'B2_BACKUP_PROVIDER')
  })

  it('"Back" returns to A1 for new visitors and B1 for existing users', () => {
    const restoreFailed = runEvents(newUserState, [{ type: 'FAILED', errorCode: 'DECRYPT_FAILED' }, { type: 'BACK_REQUESTED' }])
    assert.equal(restoreFailed.finalState.screen, 'A1_ENTRY')
    const existingFailed = runEvents(existingUserState, [{ type: 'FAILED', errorCode: 'DECRYPT_FAILED' }, { type: 'BACK_REQUESTED' }])
    assert.equal(existingFailed.finalState.screen, 'B1_BACKUP_PROMPT')
  })
})
