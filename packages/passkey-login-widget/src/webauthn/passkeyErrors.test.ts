import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BackupDecryptError, BackupFormatError } from '../crypto/backupErrors.ts'
import { ProviderAuthError } from '../storage/storageAdapter.ts'
import { PASSKEY_ERROR_MESSAGES, PasskeyFlowError, toPasskeyFlowError } from './passkeyErrors.ts'
import { PASSKEY_ERROR_CODES } from '../widgetRuntimeContract.ts'

describe('toPasskeyFlowError', () => {
  it('keeps errors that already carry a code', () => {
    const original = new PasskeyFlowError('BACKUP_NOT_FOUND', 'x')
    assert.equal(toPasskeyFlowError(original, 'BACKUP_FAILED'), original)
  })

  it('maps provider sign-in failures to D4', () => {
    assert.equal(toPasskeyFlowError(new ProviderAuthError('no'), 'BACKUP_FAILED').code, 'PROVIDER_AUTH_FAILED')
  })

  it('maps decrypt and format failures to D6', () => {
    assert.equal(toPasskeyFlowError(new BackupDecryptError('x'), 'BACKUP_FAILED').code, 'DECRYPT_FAILED')
    assert.equal(toPasskeyFlowError(new BackupFormatError('x'), 'BACKUP_FAILED').code, 'DECRYPT_FAILED')
  })

  it('maps WebAuthn dialog dismissal to D2 and missing support to D1', () => {
    assert.equal(toPasskeyFlowError(new DOMException('x', 'NotAllowedError'), 'BACKUP_FAILED').code, 'PASSKEY_CANCELLED')
    assert.equal(toPasskeyFlowError(new DOMException('x', 'AbortError'), 'BACKUP_FAILED').code, 'PASSKEY_CANCELLED')
    assert.equal(toPasskeyFlowError(new DOMException('x', 'NotSupportedError'), 'BACKUP_FAILED').code, 'UNSUPPORTED_BROWSER')
  })

  it('maps an invalid rpId (SecurityError) and unsatisfiable user verification to D1, never to the step fallback', () => {
    assert.equal(toPasskeyFlowError(new DOMException('invalid domain', 'SecurityError'), 'BACKUP_FAILED').code, 'UNSUPPORTED_BROWSER')
    assert.equal(toPasskeyFlowError(new DOMException('x', 'ConstraintError'), 'PASSKEY_CANCELLED').code, 'UNSUPPORTED_BROWSER')
  })

  it('uses the fallback code for unknown errors and never leaks their message', () => {
    const flowError = toPasskeyFlowError(new Error(`secret ${'0x11'.repeat(16)}`), 'BACKUP_FAILED')
    assert.equal(flowError.code, 'BACKUP_FAILED')
    assert.equal(flowError.message, PASSKEY_ERROR_MESSAGES.BACKUP_FAILED)
  })

  it('has a message for every error code', () => {
    for (const code of PASSKEY_ERROR_CODES) {
      assert.ok(PASSKEY_ERROR_MESSAGES[code].length > 0)
    }
  })
})
