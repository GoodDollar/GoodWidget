import type { Bytes } from '../crypto/encoding.ts'
import { PRF_SALT_TEXT } from '../crypto/prfDerivation.ts'
import { PASSKEY_ERROR_MESSAGES, PasskeyFlowError } from './passkeyErrors.ts'

const PRF_SALT = new TextEncoder().encode(PRF_SALT_TEXT)

/** ES256 and RS256: what every platform authenticator supports. */
const SUPPORTED_SIGNATURE_ALGORITHMS: PublicKeyCredentialParameters[] = [
  { type: 'public-key', alg: -7 },
  { type: 'public-key', alg: -257 },
]

export interface CreatePasskeyOptions {
  rpId: string
  appName: string
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

/** Reads `prf.results.first` from a credential's extension results; null when the authenticator gave none. */
function readPrfOutput(credential: PublicKeyCredential): Bytes | null {
  const prfResults = (credential.getClientExtensionResults() as { prf?: { results?: { first?: BufferSource } } }).prf
    ?.results
  if (!prfResults?.first) {
    return null
  }
  const first = prfResults.first
  // Copy out of the view so offsets of a larger underlying buffer are not leaked into the result
  return ArrayBuffer.isView(first)
    ? new Uint8Array(first.buffer.slice(first.byteOffset, first.byteOffset + first.byteLength))
    : new Uint8Array(first)
}

/**
 * Asks the user for an existing discoverable passkey of this rpId and returns its PRF output.
 * @param rpId         relying party id
 * @param credentialId limit the request to this credential (used right after creating a passkey)
 */
export async function authenticateWithPasskey(rpId: string, credentialId?: ArrayBuffer): Promise<PasskeyPrfResult> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      rpId,
      // No server: the challenge only has to be fresh. The assertion itself is never verified.
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      userVerification: 'required',
      allowCredentials: credentialId ? [{ type: 'public-key', id: credentialId }] : [],
      extensions: { prf: { eval: { first: PRF_SALT } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null
  if (!assertion) {
    throw new PasskeyFlowError('PASSKEY_CANCELLED', PASSKEY_ERROR_MESSAGES.PASSKEY_CANCELLED)
  }
  const prfOutput = readPrfOutput(assertion)
  if (!prfOutput) {
    throw new PasskeyFlowError('UNSUPPORTED_BROWSER', PASSKEY_ERROR_MESSAGES.UNSUPPORTED_BROWSER)
  }
  return { prfOutput }
}

/**
 * Creates a NEW discoverable passkey and returns its PRF output.
 * When the authenticator only reports `prf.enabled` at registration, a follow-up
 * assertion fetches the output. When PRF is unsupported nothing is kept and D1 is raised.
 */
export async function createPasskey({ rpId, appName }: CreatePasskeyOptions): Promise<PasskeyPrfResult> {
  const accountLabel = `${appName} ${new Date().toISOString().slice(0, 10)}`
  const credential = (await navigator.credentials.create({
    publicKey: {
      rp: { id: rpId, name: appName },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: accountLabel, displayName: accountLabel },
      // No server: the challenge only has to be fresh. The attestation is never verified.
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: SUPPORTED_SIGNATURE_ALGORITHMS,
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      extensions: { prf: { eval: { first: PRF_SALT } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null
  if (!credential) {
    throw new PasskeyFlowError('PASSKEY_CANCELLED', PASSKEY_ERROR_MESSAGES.PASSKEY_CANCELLED)
  }
  const prfOutputAtRegistration = readPrfOutput(credential)
  if (prfOutputAtRegistration) {
    return { prfOutput: prfOutputAtRegistration }
  }
  const prfExtension = (credential.getClientExtensionResults() as { prf?: { enabled?: boolean } }).prf
  if (!prfExtension?.enabled) {
    throw new PasskeyFlowError('UNSUPPORTED_BROWSER', PASSKEY_ERROR_MESSAGES.UNSUPPORTED_BROWSER)
  }
  return authenticateWithPasskey(rpId, credential.rawId)
}
