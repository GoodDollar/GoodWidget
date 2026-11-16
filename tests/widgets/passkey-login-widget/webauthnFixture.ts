import type { CDPSession, Page } from '@playwright/test'

/** Handle on a Chromium virtual authenticator that stores passkeys and answers the PRF extension. */
export interface VirtualAuthenticator {
  cdpSession: CDPSession
  authenticatorId: string
  /** Passkeys currently stored on the authenticator. */
  countCredentials(): Promise<number>
}

/**
 * Attaches a virtual platform authenticator (resident keys, user verification, PRF / hmac-secret)
 * through the Chrome DevTools Protocol. The widget's real WebAuthn calls run against it unchanged,
 * so the same passkey derives the same PRF output across widget restarts.
 * @param options.hasPrf false makes an authenticator without the PRF / hmac-secret extension, like a provider that lacks PRF
 */
export async function addVirtualAuthenticator(page: Page, options: { hasPrf?: boolean } = {}): Promise<VirtualAuthenticator> {
  const { hasPrf = true } = options
  const cdpSession = await page.context().newCDPSession(page)
  await cdpSession.send('WebAuthn.enable')
  const { authenticatorId } = await cdpSession.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      ctap2Version: 'ctap2_1',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
      hasPrf,
    },
  })
  return {
    cdpSession,
    authenticatorId,
    async countCredentials() {
      const { credentials } = await cdpSession.send('WebAuthn.getCredentials', { authenticatorId })
      return credentials.length
    },
  }
}

/** Ways the browser's WebAuthn can misbehave, for the error screens. */
export type WebAuthnFailureMode =
  /** The user dismisses the passkey dialog (`navigator.credentials.*` rejects with NotAllowedError). */
  | 'user-cancelled'
  /** The browser has no WebAuthn at all (`PublicKeyCredential` is undefined). */
  | 'no-webauthn'
  /** The authenticator answers without PRF results. */
  | 'no-prf'

/** Replaces WebAuthn before the page loads, so the widget meets the chosen failure. */
export async function stubWebAuthnFailure(page: Page, failureMode: WebAuthnFailureMode): Promise<void> {
  await page.addInitScript((mode) => {
    if (mode === 'no-webauthn') {
      Object.defineProperty(window, 'PublicKeyCredential', { value: undefined, configurable: true })
      return
    }
    const rejectAsCancelled = () => Promise.reject(new DOMException('The operation was cancelled.', 'NotAllowedError'))
    if (mode === 'user-cancelled') {
      navigator.credentials.create = rejectAsCancelled
      navigator.credentials.get = rejectAsCancelled
      return
    }
    // no-prf: a credential whose extension results carry no PRF output
    const credentialWithoutPrf = {
      id: 'stub',
      type: 'public-key',
      rawId: new Uint8Array([1, 2, 3, 4]).buffer,
      getClientExtensionResults: () => ({}),
    }
    navigator.credentials.create = () => Promise.resolve(credentialWithoutPrf as unknown as Credential)
    navigator.credentials.get = () => Promise.resolve(credentialWithoutPrf as unknown as Credential)
  }, failureMode)
}

/**
 * Makes passkey creation report only `prf: { enabled: true }` without PRF results, like authenticators
 * that evaluate PRF at assertion time only. The widget must then run a follow-up `get()`.
 * Call after `addVirtualAuthenticator` so the wrapped `create` still reaches the virtual authenticator.
 */
export async function stubPrfEnabledOnlyAtRegistration(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const createWithAuthenticator = navigator.credentials.create.bind(navigator.credentials)
    navigator.credentials.create = async (options) => {
      const credential = (await createWithAuthenticator(options)) as PublicKeyCredential
      Object.defineProperty(credential, 'getClientExtensionResults', {
        value: () => ({ prf: { enabled: true } }),
      })
      return credential
    }
  })
}
