import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { PRF_SALT_TEXT } from '../crypto/prfDerivation.ts'
import { authenticateWithPasskey, createPasskey } from './passkeyClient.ts'
import { PasskeyFlowError } from './passkeyErrors.ts'

type CredentialsCall = { method: 'create' | 'get'; publicKey: PublicKeyCredentialCreationOptions & PublicKeyCredentialRequestOptions }

const PRF_BYTES = new Uint8Array(32).fill(7)
const CREDENTIAL_ID = new Uint8Array([1, 2, 3]).buffer

/** A credential as `navigator.credentials` returns it, with the given client extension results. */
function fakeCredential(extensionResults: Record<string, unknown>): PublicKeyCredential {
  return { rawId: CREDENTIAL_ID, getClientExtensionResults: () => extensionResults } as unknown as PublicKeyCredential
}

const prfResults = { prf: { results: { first: PRF_BYTES.buffer } } }

/** Replaces `navigator.credentials` with scripted answers; every answer is a value to resolve with or an Error to reject with. */
function installFakeCredentials(script: { create?: Array<unknown>; get?: Array<unknown> }): CredentialsCall[] {
  const calls: CredentialsCall[] = []
  const answerFor = (method: 'create' | 'get') => async (options: { publicKey: CredentialsCall['publicKey'] }) => {
    calls.push({ method, publicKey: options.publicKey })
    const answer = (script[method] ?? []).shift()
    if (answer instanceof Error || (typeof answer === 'object' && answer !== null && 'name' in answer && 'message' in answer && !('rawId' in answer))) {
      throw answer
    }
    return answer
  }
  Object.defineProperty(globalThis, 'navigator', {
    value: { credentials: { create: answerFor('create'), get: answerFor('get') } },
    configurable: true,
  })
  return calls
}

async function rejectionOf(promise: Promise<unknown>): Promise<PasskeyFlowError> {
  try {
    await promise
  } catch (error) {
    assert.ok(error instanceof PasskeyFlowError, `expected a PasskeyFlowError, got ${String(error)}`)
    return error
  }
  throw new Error('expected the promise to reject')
}

const options = { rpId: 'example.org', appName: 'Test app' }
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

describe('passkeyClient', () => {
  beforeEach(() => {
    installFakeCredentials({})
  })
  afterEach(() => {
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator)
    }
  })

  describe('createPasskey', () => {
    it('sends prf.eval with the salt as bytes at registration and uses the output it returns', async () => {
      const calls = installFakeCredentials({ create: [fakeCredential(prfResults)] })
      const { prfOutput } = await createPasskey(options)
      assert.deepEqual([...prfOutput], [...PRF_BYTES])
      assert.equal(calls.length, 1)
      const extensions = calls[0].publicKey.extensions as { prf: { eval: { first: Uint8Array } } }
      assert.equal(new TextDecoder().decode(extensions.prf.eval.first), PRF_SALT_TEXT)
      assert.equal(calls[0].publicKey.authenticatorSelection?.residentKey, 'required')
    })

    it('reads the output with a follow-up assertion limited to the new credential when PRF is only enabled', async () => {
      const calls = installFakeCredentials({
        create: [fakeCredential({ prf: { enabled: true } })],
        get: [fakeCredential(prfResults)],
      })
      const { prfOutput } = await createPasskey(options)
      assert.deepEqual([...prfOutput], [...PRF_BYTES])
      assert.deepEqual(
        calls.map((call) => call.method),
        ['create', 'get'],
      )
      assert.deepEqual(calls[1].publicKey.allowCredentials, [{ type: 'public-key', id: CREDENTIAL_ID }])
    })

    it('retries once asking only to enable PRF when the provider rejects prf.eval with a plain Error', async () => {
      const calls = installFakeCredentials({
        create: [new Error('Unsupported extension prf.eval'), fakeCredential({ prf: { enabled: true } })],
        get: [fakeCredential(prfResults)],
      })
      const { prfOutput } = await createPasskey(options)
      assert.deepEqual([...prfOutput], [...PRF_BYTES])
      assert.deepEqual(
        calls.map((call) => call.method),
        ['create', 'create', 'get'],
      )
      assert.deepEqual((calls[1].publicKey.extensions as { prf: object }).prf, {})
    })

    it('names both attempts when the enable-only retry fails too, as PASSKEY_FAILED and not cancelled', async () => {
      installFakeCredentials({ create: [new Error('first boom'), new Error('second boom')] })
      const flowError = await rejectionOf(createPasskey(options))
      assert.equal(flowError.code, 'PASSKEY_FAILED')
      assert.equal(
        flowError.diagnostic,
        'create-prf-enable-only: Error: second boom (after create: Error: first boom)',
      )
    })

    it('does not retry a dismissed registration, from this realm or another', async () => {
      for (const dismissal of [new DOMException('dismissed', 'NotAllowedError'), { name: 'NotAllowedError', message: 'dismissed' }]) {
        const calls = installFakeCredentials({ create: [dismissal] })
        const flowError = await rejectionOf(createPasskey(options))
        assert.equal(flowError.code, 'PASSKEY_CANCELLED')
        assert.equal(flowError.diagnostic, 'create: NotAllowedError: dismissed')
        assert.equal(calls.length, 1)
      }
    })

    it('does not retry a registration the provider cannot do at all and ends on D1', async () => {
      const calls = installFakeCredentials({ create: [new DOMException('no ES256', 'NotSupportedError')] })
      const flowError = await rejectionOf(createPasskey(options))
      assert.equal(flowError.code, 'UNSUPPORTED_BROWSER')
      assert.equal(calls.length, 1)
    })

    it('ends on D1 naming prf-missing when the new passkey reports no PRF extension, and exposes the saved passkey', async () => {
      installFakeCredentials({ create: [fakeCredential({ credProps: { rk: true } })] })
      let createdCredentialId: ArrayBuffer | undefined
      const flowError = await rejectionOf(
        createPasskey({ ...options, onCredentialCreated: (credentialId) => (createdCredentialId = credentialId) }),
      )
      assert.equal(flowError.code, 'UNSUPPORTED_BROWSER')
      assert.match(flowError.diagnostic ?? '', /^prf-missing: .*extension results: \[credProps\].*prf\.enabled: undefined/)
      assert.equal(createdCredentialId, CREDENTIAL_ID)
    })

    it('ends on D1 naming prf-missing when the provider says PRF is not enabled', async () => {
      const calls = installFakeCredentials({ create: [fakeCredential({ prf: { enabled: false } })] })
      const flowError = await rejectionOf(createPasskey(options))
      assert.equal(flowError.code, 'UNSUPPORTED_BROWSER')
      assert.match(flowError.diagnostic ?? '', /^prf-missing: .*prf\.enabled: false/)
      assert.equal(calls.length, 1)
    })

    it('reports a credential whose extension results cannot be read as prf-missing, not cancelled', async () => {
      installFakeCredentials({
        create: [
          {
            rawId: CREDENTIAL_ID,
            getClientExtensionResults: () => {
              throw new TypeError('not a function')
            },
          },
        ],
      })
      const flowError = await rejectionOf(createPasskey(options))
      assert.equal(flowError.code, 'PASSKEY_FAILED')
      assert.equal(flowError.diagnostic, 'prf-missing: TypeError: not a function')
    })

    it('names prf-followup-get when the follow-up assertion rejects with a plain Error', async () => {
      installFakeCredentials({
        create: [fakeCredential({ prf: { enabled: true } })],
        get: [new Error('manager has no such credential')],
      })
      const flowError = await rejectionOf(createPasskey(options))
      assert.equal(flowError.code, 'PASSKEY_FAILED')
      assert.equal(flowError.diagnostic, 'prf-followup-get: Error: manager has no such credential')
    })

    it('reports a dismissed follow-up assertion as PASSKEY_FAILED', async () => {
      installFakeCredentials({
        create: [fakeCredential({ prf: { enabled: true } })],
        get: [new DOMException('dismissed', 'NotAllowedError')],
      })
      assert.equal((await rejectionOf(createPasskey(options))).code, 'PASSKEY_FAILED')
    })

    it('ends on D1 naming prf-followup-get when the follow-up assertion returns no PRF result', async () => {
      installFakeCredentials({
        create: [fakeCredential({ prf: { enabled: true } })],
        get: [fakeCredential({ prf: { enabled: true } })],
      })
      const flowError = await rejectionOf(createPasskey(options))
      assert.equal(flowError.code, 'UNSUPPORTED_BROWSER')
      assert.match(flowError.diagnostic ?? '', /^prf-followup-get: /)
    })

    it('resumes with only the follow-up assertion for a passkey that was created but not yet read', async () => {
      const calls = installFakeCredentials({ get: [fakeCredential(prfResults)] })
      const { prfOutput } = await createPasskey({ ...options, resumeCredentialId: CREDENTIAL_ID })
      assert.deepEqual([...prfOutput], [...PRF_BYTES])
      assert.deepEqual(
        calls.map((call) => call.method),
        ['get'],
      )
      assert.deepEqual(calls[0].publicKey.allowCredentials, [{ type: 'public-key', id: CREDENTIAL_ID }])
    })

    it('treats a registration that resolves with no credential as cancelled', async () => {
      installFakeCredentials({ create: [null] })
      assert.equal((await rejectionOf(createPasskey(options))).code, 'PASSKEY_CANCELLED')
    })
  })

  describe('authenticateWithPasskey', () => {
    it('returns the PRF output of an assertion', async () => {
      installFakeCredentials({ get: [fakeCredential(prfResults)] })
      assert.deepEqual([...(await authenticateWithPasskey('example.org')).prfOutput], [...PRF_BYTES])
    })

    it('names the get step and the real message when the provider rejects with a plain Error', async () => {
      installFakeCredentials({ get: [new Error('vault is locked')] })
      const flowError = await rejectionOf(authenticateWithPasskey('example.org'))
      assert.equal(flowError.code, 'PASSKEY_FAILED')
      assert.equal(flowError.diagnostic, 'get: Error: vault is locked')
    })

    it('ends on D1 when the assertion carries no PRF result', async () => {
      installFakeCredentials({ get: [fakeCredential({})] })
      const flowError = await rejectionOf(authenticateWithPasskey('example.org'))
      assert.equal(flowError.code, 'UNSUPPORTED_BROWSER')
      assert.match(flowError.diagnostic ?? '', /^get: /)
    })

    it('treats a dismissed assertion and an empty answer as cancelled', async () => {
      installFakeCredentials({ get: [new DOMException('dismissed', 'NotAllowedError'), null] })
      assert.equal((await rejectionOf(authenticateWithPasskey('example.org'))).code, 'PASSKEY_CANCELLED')
      assert.equal((await rejectionOf(authenticateWithPasskey('example.org'))).code, 'PASSKEY_CANCELLED')
    })
  })
})
