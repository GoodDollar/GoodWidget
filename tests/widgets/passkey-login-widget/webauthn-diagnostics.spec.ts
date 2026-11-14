import { expect, test, type Page } from '@playwright/test'
import { addVirtualAuthenticator, stubWebAuthnFailure } from './webauthnFixture'
import { installFakeGoogleDrive } from './fakeGoogleDrive'
import { expectScreen, openInteractionStory, openLiveStoryWithGoogleDrive, pressButton } from './interactionHelpers'

/**
 * Regression for the second Live-story report on PR #308: "Create new account" ended on D2 "Passkey request
 * cancelled" although no passkey dialog was ever shown. A browser rejects `create()` / `get()` with the same
 * NotAllowedError for a dismissed dialog and for a page that may not use WebAuthn at all, so these specs pin
 * down which of the two the host and the reader of the event log get to see.
 */

// A different host than Storybook's `localhost`, so the iframe is cross-origin, yet still a secure context (WebAuthn needs one)
const EMBEDDING_PAGE_ORIGIN = 'http://127.0.0.1:6999'
const LIVE_STORY_PATH =
  '/iframe.html?id=qa-passkeyloginwidget-live-real-passkey-real-providers--live&viewMode=story&args=googleClientId:fake-client-id'
const WEBAUTHN_DELEGATION = 'publickey-credentials-get *; publickey-credentials-create *'

/**
 * Serves a page on another origin that embeds the Live story in an iframe, like a host app embedding the widget.
 * @param allowAttribute value of the iframe's `allow` attribute; omit to embed without delegating WebAuthn
 */
async function openLiveStoryInsideCrossOriginIframe(page: Page, storybookOrigin: string, allowAttribute?: string): Promise<void> {
  await page.route(`${EMBEDDING_PAGE_ORIGIN}/host.html`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><iframe width="440" height="900" ${allowAttribute ? `allow="${allowAttribute}"` : ''} src="${storybookOrigin}${LIVE_STORY_PATH}"></iframe>`,
    }),
  )
  await page.goto(`${EMBEDDING_PAGE_ORIGIN}/host.html`)
}

test.describe('WebAuthn blocked for the widget by an embedding page (cross-origin iframe)', () => {
  test('without a Permissions Policy delegation the widget shows D1 up front and explains why, instead of a fake "cancelled" D2', async ({ page, baseURL }) => {
    const authenticator = await addVirtualAuthenticator(page)
    await installFakeGoogleDrive(page, 'grant-only-with-user-gesture')
    await openLiveStoryInsideCrossOriginIframe(page, baseURL as string)

    const embeddedWidget = page.frameLocator('iframe').getByTestId('passkey-login-widget')
    await expect(embeddedWidget).toHaveAttribute('data-screen', 'D1_UNSUPPORTED_BROWSER', { timeout: 20_000 })
    const eventLog = page.frameLocator('iframe').getByTestId('passkey-event-log')
    await expect(eventLog).toContainText('error → UNSUPPORTED_BROWSER')
    await expect(eventLog).toContainText('Permissions Policy')
    await expect(eventLog).toContainText('publickey-credentials-create')
    expect(await authenticator.countCredentials()).toBe(0)
  })

  test('with the delegation the same embedded widget creates a new account end to end', async ({ page, baseURL }) => {
    const authenticator = await addVirtualAuthenticator(page)
    await installFakeGoogleDrive(page, 'grant-only-with-user-gesture')
    await openLiveStoryInsideCrossOriginIframe(page, baseURL as string, WEBAUTHN_DELEGATION)

    const embedded = page.frameLocator('iframe')
    const embeddedWidget = embedded.getByTestId('passkey-login-widget')
    const pressEmbeddedButton = (buttonName: string) => embeddedWidget.getByRole('button', { name: buttonName, exact: true }).click()
    await expect(embeddedWidget).toHaveAttribute('data-screen', 'A1_ENTRY', { timeout: 20_000 })

    await pressEmbeddedButton('Continue with passkey')
    await expect(embeddedWidget).toHaveAttribute('data-screen', 'D2_PASSKEY_CANCELLED')
    await pressEmbeddedButton('Create new account')
    await pressEmbeddedButton('Create new account')
    await expect(embeddedWidget).toHaveAttribute('data-screen', 'B4_BACKUP_SUCCESS')
    expect(await authenticator.countCredentials()).toBe(1)
  })
})

test.describe('the Live story event log explains a rejected passkey request', () => {
  test('a dismissed dialog shows the code and the browser reason in the event log, onError and the console', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => message.type() === 'error' && consoleErrors.push(message.text()))
    await stubWebAuthnFailure(page, 'user-cancelled')
    await installFakeGoogleDrive(page, 'grant-only-with-user-gesture')
    await openLiveStoryWithGoogleDrive(page)

    await pressButton(page, 'Continue with passkey')
    await expectScreen(page, 'D2_PASSKEY_CANCELLED')
    const expectedReason = 'NotAllowedError: The operation was cancelled.'
    await expect(page.getByTestId('passkey-event-log')).toContainText(`error → PASSKEY_CANCELLED`)
    await expect(page.getByTestId('passkey-event-log')).toContainText(expectedReason)
    expect(consoleErrors.some((text) => text.includes(`PASSKEY_CANCELLED`) && text.includes(expectedReason))).toBe(true)
  })

  test('a rejected create() after "Create new account" reports its own reason, not only the generic code', async ({ page }) => {
    await addVirtualAuthenticator(page)
    await installFakeGoogleDrive(page, 'grant-only-with-user-gesture')
    await openLiveStoryWithGoogleDrive(page)
    await pressButton(page, 'Continue with passkey')
    await expectScreen(page, 'D2_PASSKEY_CANCELLED')
    // From here on the browser refuses to create a passkey without showing a dialog
    await page.evaluate(() => {
      navigator.credentials.create = () => Promise.reject(new DOMException('The request is not allowed by the user agent.', 'NotAllowedError'))
    })

    await pressButton(page, 'Create new account')
    await pressButton(page, 'Create new account')
    await expectScreen(page, 'D2_PASSKEY_CANCELLED')
    await expect(page.getByTestId('passkey-event-log')).toContainText('NotAllowedError: The request is not allowed by the user agent.')
  })
})

test.describe('WebAuthn calls run inside the click that asked for them', () => {
  test('get() and create() both start while the click still carries transient user activation', async ({ page }) => {
    await addVirtualAuthenticator(page)
    // Records whether the page had user activation at the moment each WebAuthn call started
    await page.addInitScript(() => {
      const activationAtCall: Record<string, boolean> = {}
      ;(window as unknown as { __activationAtCall: Record<string, boolean> }).__activationAtCall = activationAtCall
      for (const method of ['get', 'create'] as const) {
        const originalMethod = navigator.credentials[method].bind(navigator.credentials) as (options?: CredentialRequestOptions & CredentialCreationOptions) => Promise<Credential | null>
        navigator.credentials[method] = ((options?: CredentialRequestOptions & CredentialCreationOptions) => {
          activationAtCall[method] = navigator.userActivation.isActive
          return originalMethod(options)
        }) as typeof navigator.credentials.get
      }
    })
    await openInteractionStory(page, 'one-provider')

    await pressButton(page, 'Continue with passkey')
    await expectScreen(page, 'D2_PASSKEY_CANCELLED')
    await pressButton(page, 'Create new account')
    await pressButton(page, 'Create new account')
    await expectScreen(page, 'B4_BACKUP_SUCCESS')

    const activationAtCall = await page.evaluate(() => (window as unknown as { __activationAtCall: Record<string, boolean> }).__activationAtCall)
    expect(activationAtCall).toEqual({ get: true, create: true })
  })
})
