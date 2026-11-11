import { BackupDecryptError, BackupFormatError } from '../crypto/backupErrors.ts'
import { ProviderAuthError } from '../storage/storageAdapter.ts'
import type { PasskeyErrorCode } from '../widgetRuntimeContract.ts'

/** An error that already knows which D screen / `onError` code it belongs to. */
export class PasskeyFlowError extends Error {
  code: PasskeyErrorCode

  constructor(code: PasskeyErrorCode, message: string) {
    super(message)
    this.name = 'PasskeyFlowError'
    this.code = code
  }
}

/** User-facing messages per code. They never include key material. */
export const PASSKEY_ERROR_MESSAGES: Record<PasskeyErrorCode, string> = {
  UNSUPPORTED_BROWSER: "This browser doesn't support passkey login.",
  PASSKEY_CANCELLED: 'The passkey request was cancelled or no passkey was found.',
  BACKUP_NOT_FOUND: 'No backup was found for this passkey.',
  PROVIDER_AUTH_FAILED: "Couldn't connect to the backup provider.",
  BACKUP_FAILED: 'The backup could not be written.',
  DECRYPT_FAILED: "The backup couldn't be unlocked with this passkey.",
  AMBIGUOUS_BACKUP: 'More than one backup was found for this passkey.',
}

/**
 * Maps anything thrown while running the flow to a `PasskeyFlowError`.
 * WebAuthn cannot tell "no passkey" from "cancelled", so both are `PASSKEY_CANCELLED`.
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
    if (error.name === 'NotSupportedError') {
      return new PasskeyFlowError('UNSUPPORTED_BROWSER', PASSKEY_ERROR_MESSAGES.UNSUPPORTED_BROWSER)
    }
    if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
      return new PasskeyFlowError('PASSKEY_CANCELLED', PASSKEY_ERROR_MESSAGES.PASSKEY_CANCELLED)
    }
  }
  return new PasskeyFlowError(fallbackCode, PASSKEY_ERROR_MESSAGES[fallbackCode])
}
