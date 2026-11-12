import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BackupDecryptError, BackupFormatError } from '../crypto/backupErrors.ts'
import { ProviderAuthError } from '../storage/storageAdapter.ts'
import { PASSKEY_ERROR_MESSAGES, PasskeyFlowError, toPasskeyFlowError, toWebAuthnStepError } from './passkeyErrors.ts'
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

  it('keeps the browser\'s DOMException name and message as a developer diagnostic, apart from the user-facing message', () => {
    const flowError = toPasskeyFlowError(new DOMException('The operation is not allowed', 'NotAllowedError'), 'BACKUP_FAILED')
    assert.equal(flowError.diagnostic, 'NotAllowedError: The operation is not allowed')
    assert.equal(flowError.message, PASSKEY_ERROR_MESSAGES.PASSKEY_CANCELLED)
  })

  it('keeps only the error name, never the message, as the diagnostic of non-DOM errors', () => {
    const flowError = toPasskeyFlowError(new TypeError('secret 0xabc'), 'BACKUP_FAILED')
    assert.equal(flowError.diagnostic, 'TypeError')
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

describe('toWebAuthnStepError', () => {
  it('names the step, the error name and the real message of a plain Error and never calls it cancelled', () => {
    const flowError = toWebAuthnStepError('create', new Error('provider exploded'))
    assert.equal(flowError.code, 'PASSKEY_FAILED')
    assert.equal(flowError.diagnostic, 'create: Error: provider exploded')
  })

  it('treats a NotAllowedError as a dismissal even when it comes from another realm (fails instanceof)', () => {
    const crossRealmError = { name: 'NotAllowedError', message: 'The operation either timed out or was not allowed.' }
    const flowError = toWebAuthnStepError('get', crossRealmError)
    assert.equal(flowError.code, 'PASSKEY_CANCELLED')
    assert.equal(flowError.diagnostic, 'get: NotAllowedError: The operation either timed out or was not allowed.')
  })

  it('reports a dismissed follow-up assertion as a failure, because the passkey already exists', () => {
    assert.equal(toWebAuthnStepError('prf-followup-get', new DOMException('x', 'NotAllowedError'), false).code, 'PASSKEY_FAILED')
  })

  it('maps requests the browser or provider cannot do to D1', () => {
    for (const name of ['NotSupportedError', 'SecurityError', 'ConstraintError']) {
      assert.equal(toWebAuthnStepError('create', new DOMException('x', name)).code, 'UNSUPPORTED_BROWSER')
    }
  })

  it('describes thrown non-errors without crashing', () => {
    assert.equal(toWebAuthnStepError('get', 'oops').diagnostic, 'get: string: oops')
    assert.equal(toWebAuthnStepError('get', undefined).code, 'PASSKEY_FAILED')
  })

  it('keeps the original thrown value as the cause', () => {
    const original = new Error('x')
    assert.equal(toWebAuthnStepError('create', original).cause, original)
  })
})