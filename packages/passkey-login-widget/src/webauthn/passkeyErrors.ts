import { BackupDecryptError, BackupFormatError } from '../crypto/backupErrors.ts'
import { ProviderAuthError } from '../storage/storageAdapter.ts'
import type { PasskeyErrorCode } from '../widgetRuntimeContract.ts'

/** An error that already knows which D screen / `onError` code it belongs to. */
export class PasskeyFlowError extends Error {
  code: PasskeyErrorCode
  /**
   * Developer-facing reason (e.g. "NotAllowedError: <browser message>"). Only ever the name and message of a
   * browser-generated DOMException or a fixed string of ours, so it cannot hold key material.
   */
  diagnostic?: string

  constructor(code: PasskeyErrorCode, message: string, diagnostic?: string, options?: { cause?: unknown }) {
    // `cause` keeps the original thrown value so the console shows the real error and its stack
    super(message, options)
    this.name = 'PasskeyFlowError'
    this.code = code
    this.diagnostic = diagnostic
  }
}

/** User-facing messages per code. They never include key material. */
export const PASSKEY_ERROR_MESSAGES: Record<PasskeyErrorCode, string> = {
  UNSUPPORTED_BROWSER: "This browser or passkey provider doesn't support passkey login.",
  PASSKEY_CANCELLED: 'The passkey request was cancelled or no passkey was found.',
  PASSKEY_FAILED: 'The passkey request failed.',
  BACKUP_NOT_FOUND: 'No backup was found for this passkey.',
  PROVIDER_AUTH_FAILED: "Couldn't connect to the backup provider.",
  BACKUP_FAILED: 'The backup could not be written.',
  DECRYPT_FAILED: "The backup couldn't be unlocked with this passkey.",
  AMBIGUOUS_BACKUP: 'More than one backup was found for this passkey.',
}

/** The WebAuthn / PRF steps of the flow; every failure of one of them names its step in the diagnostic. */
export type WebAuthnStep =
  | 'get' // existing passkey assertion (login)
  | 'create' // new passkey with the PRF salt evaluated at registration
  | 'create-prf-enable-only' // new passkey asking only to enable PRF (retry when the provider rejects `prf.eval` at registration)
  | 'prf-missing' // the new passkey reports no usable PRF support
  | 'prf-followup-get' // assertion right after registration to read the PRF output

/** Browser / provider rejection names that mean the user dismissed the request (or there was no passkey). */
const CANCELLATION_ERROR_NAMES = ['NotAllowedError', 'AbortError']
/** Rejection names that mean this browser, provider or origin cannot do the request at all; a retry cannot help. */
const UNSUPPORTED_ERROR_NAMES = ['NotSupportedError', 'SecurityError', 'ConstraintError']

/** Reads `name` and `message` by shape: errors thrown by an injected password manager can come from another realm and fail `instanceof`. */
function readErrorNameAndMessage(error: unknown): { name: string; message: string } {
  const candidate = (typeof error === 'object' && error !== null ? error : {}) as { name?: unknown; message?: unknown }
  return {
    name: typeof candidate.name === 'string' ? candidate.name : typeof error,
    message: typeof candidate.message === 'string' ? candidate.message : String(error),
  }
}

/** Whether a rejected WebAuthn request looks like the user dismissing it (or a missing passkey), judged by the error name only. */
export function isWebAuthnCancellation(error: unknown): boolean {
  return CANCELLATION_ERROR_NAMES.includes(readErrorNameAndMessage(error).name)
}

/**
 * Turns whatever a `navigator.credentials` call (or the PRF read after it) threw into a typed error that names the
 * failing step. The name and message come from the browser or the passkey provider, never from our own key handling,
 * so they are safe to show developers. Only dismissals are "cancelled"; unknown rejections are `PASSKEY_FAILED`.
 * @param step                 the WebAuthn step that threw
 * @param error                the thrown value
 * @param isDismissalPossible  false for steps the user did not start with a prompt of their own (the follow-up
 *                             assertion): a dismissal there leaves a created passkey unusable, so it is a failure
 */
export function toWebAuthnStepError(step: WebAuthnStep, error: unknown, isDismissalPossible = true): PasskeyFlowError {
  if (error instanceof PasskeyFlowError) {
    return error
  }
  const { name, message } = readErrorNameAndMessage(error)
  const diagnostic = `${step}: ${name}: ${message}`
  if (UNSUPPORTED_ERROR_NAMES.includes(name)) {
    return new PasskeyFlowError('UNSUPPORTED_BROWSER', PASSKEY_ERROR_MESSAGES.UNSUPPORTED_BROWSER, diagnostic, { cause: error })
  }
  if (isDismissalPossible && CANCELLATION_ERROR_NAMES.includes(name)) {
    return new PasskeyFlowError('PASSKEY_CANCELLED', PASSKEY_ERROR_MESSAGES.PASSKEY_CANCELLED, diagnostic, { cause: error })
  }
  return new PasskeyFlowError('PASSKEY_FAILED', PASSKEY_ERROR_MESSAGES.PASSKEY_FAILED, diagnostic, { cause: error })
}

/**
 * Maps anything thrown while running the flow to a `PasskeyFlowError`.
 * WebAuthn cannot tell "no passkey" from "cancelled", so both are `PASSKEY_CANCELLED`.
 * The fallback must name the step that failed: a failure before any backup was attempted is never `BACKUP_FAILED`.
 * @param error        the thrown value
 * @param fallbackCode code to use when the error is not one of the known kinds
 */
export function toPasskeyFlowError(error: unknown, fallbackCode: PasskeyErrorCode): PasskeyFlowError {
  if (error instanceof PasskeyFlowError) {
    return error
  }
  if (error instanceof ProviderAuthError) {
    return new PasskeyFlowError('PROVIDER_AUTH_FAILED', PASSKEY_ERROR_MESSAGES.PROVIDER_AUTH_FAILED)
  }
  if (error instanceof BackupDecryptError || error instanceof BackupFormatError) {
    return new PasskeyFlowError('DECRYPT_FAILED', PASSKEY_ERROR_MESSAGES.DECRYPT_FAILED)
  }
  if (error instanceof DOMException) {
    // WebAuthn rejects with the same few names for very different causes, so the browser's own wording is kept for developers
    const diagnostic = `${error.name}: ${error.message}`
    // SecurityError: the rpId is not valid for this origin (e.g. an IP address host); ConstraintError: no
    // authenticator offers the required user verification. Neither is a cancellation and a retry cannot fix them.
    if (error.name === 'NotSupportedError' || error.name === 'SecurityError' || error.name === 'ConstraintError') {
      return new PasskeyFlowError('UNSUPPORTED_BROWSER', PASSKEY_ERROR_MESSAGES.UNSUPPORTED_BROWSER, diagnostic)
    }
    // NotAllowedError is also what browsers throw, without any dialog, when the page may not use WebAuthn at all
    // (e.g. a cross-origin iframe without a Permissions Policy), so a "cancelled" screen can hide a blocked request
    if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
      return new PasskeyFlowError('PASSKEY_CANCELLED', PASSKEY_ERROR_MESSAGES.PASSKEY_CANCELLED, diagnostic)
    }
    return new PasskeyFlowError(fallbackCode, PASSKEY_ERROR_MESSAGES[fallbackCode], diagnostic)
  }
  return new PasskeyFlowError(fallbackCode, PASSKEY_ERROR_MESSAGES[fallbackCode], error instanceof Error ? error.name : undefined, {
    cause: error,
  })
}
