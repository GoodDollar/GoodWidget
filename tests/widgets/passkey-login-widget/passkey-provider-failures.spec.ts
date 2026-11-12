import { expect, test, type Page } from '@playwright/test'
import { addVirtualAuthenticator, stubPrfEnabledOnlyAtRegistration } from './webauthnFixture'
import { expectScreen, openInteractionStory, pressButton, readErrorCodes, startRecordingScreens, readRecordedScreens } from './interactionHelpers'

/**
 * Regression for the third Live-story report on PR #308: "Create new account" ended on D2 "cancelled" with the event
 * log line "PASSKEY_CANCELLED ... [Error]", i.e. a plain Error (not a NotAllowedError) fell through to the default
 * code. Password managers that replace \`navigator.credentials\` can reject with plain Errors, or lack PRF; every such
 * path must now say which step failed and never be shown as "cancelled".
 */

const EVENT_LOG = 'passkey-event-log'

/** Walks A1 -> D2 (no passkey yet) -> A3 -> A4 with the virtual authenticator. */
async function startNewAccountFromEntry(page: Page): Promise<void> {
  await expectScreen(page, 'A1_ENTRY')
  await pressButton(page, 'Continue with passkey')
  await expectScreen(page, 'D2_PASSKEY_CANCELLED')
  await pressButton(page, 'Create new account')
  await expectScreen(page, 'A3_NEW_ACCOUNT_WARNING')
  await pressButton(page, 'Create new account')
}

/** Counts `navigator.credentials.create` calls and records whether each asked for `prf.eval`. */
async function recordCreateCalls(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const createCalls: Array<{ hasPrfEval: boolean }> = []
    ;(window as unknown as { __createCalls: typeof createCalls }).__createCalls = createCalls
    const createWithAuthenticator = navigator.credentials.create.bind(navigator.credentials)
    navigator.credentials.create = (options) => {
      const prfInput = (options?.publicKey?.extensions as { prf?: { eval?: unknown } } | undefined)?.prf
      createCalls.push({ hasPrfEval: prfInput?.eval !== undefined })
      return createWithAuthenticator(options)
    }
  })
}

async function readCreateCalls(page: Page): Promise<Array<{ hasPrfEval: boolean }>> {
  return page.evaluate(() => (window as unknown as { __createCalls: Array<{ hasPrfEval: boolean }> }).__createCalls)
}

test.describe('provider without PRF', () => {
  test('a virtual authenticator without PRF ends on D1 naming prf-missing, and the saved passkey is reported', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => message.type() === 'error' && consoleErrors.push(message.text()))
    const authenticator = await addVirtualAuthenticator(page, { hasPrf: false })
    await openInteractionStory(page, 'one-provider')

    await startNewAccountFromEntry(page)
    await expectScreen(page, 'D1_UNSUPPORTED_BROWSER')
    await expect(page.getByTestId('screen-D1')).toContainText("doesn't support the feature passkey login needs")
    await expect(page.getByTestId('screen-D1')).toContainText('Google Password Manager')
    expect(await readErrorCodes(page)).toEqual(['PASSKEY_CANCELLED', 'UNSUPPORTED_BROWSER'])
    await expect(page.getByTestId(EVENT_LOG)).toContainText('prf-missing')
    expect(consoleErrors.some((text) => text.includes('UNSUPPORTED_BROWSER') && text.includes('prf-missing'))).toBe(true)
    // The provider saved the passkey before the widget could tell it has no PRF; the diagnostic says it can be deleted
    expect(await authenticator.countCredentials()).toBe(1)
    await expect(page.getByTestId(EVENT_LOG)).toContainText('can be deleted there')
  })

  test('a provider that reports prf.enabled but returns no output at the follow-up assertion ends on D1 naming prf-followup-get', async ({ page }) => {
    await addVirtualAuthenticator(page)
    await stubPrfEnabledOnlyAtRegistration(page)
    await page.addInitScript(() => {
      // Assertions after registration answer without a PRF result
      const getWithAuthenticator = navigator.credentials.get.bind(navigator.credentials)
      let hasRegistered = false
      const createWithAuthenticator = navigator.credentials.create.bind(navigator.credentials)
      navigator.credentials.create = async (options) => {
        const credential = await createWithAuthenticator(options)
        hasRegistered = true
        return credential
      }
      navigator.credentials.get = async (options) => {
        const assertion = (await getWithAuthenticator(options)) as PublicKeyCredential
        if (hasRegistered) {
          Object.defineProperty(assertion, 'getClientExtensionResults', { value: () => ({}) })
        }
        return assertion
      }
    })
    await openInteractionStory(page, 'one-provider')

    await startNewAccountFromEntry(page)
    await expectScreen(page, 'D1_UNSUPPORTED_BROWSER')
    await expect(page.getByTestId(EVENT_LOG)).toContainText('prf-followup-get')
  })
})

test.describe('provider rejects the registration with a plain Error', () => {
  test('a provider that rejects prf.eval at registration is retried with PRF enabled only, and the whole journey succeeds', async ({ page }) => {
    const authenticator = await addVirtualAuthenticator(page)
    await page.addInitScript(() => {
      const createWithAuthenticator = navigator.credentials.create.bind(navigator.credentials)
      navigator.credentials.create = (options) => {
        const prfInput = (options?.publicKey?.extensions as { prf?: { eval?: unknown } } | undefined)?.prf
        return prfInput?.eval !== undefined
          ? Promise.reject(new Error('Unsupported extension input: prf.eval'))
          : createWithAuthenticator(options)
      }
    })
    await recordCreateCalls(page)
    await openInteractionStory(page, 'one-provider')

    await startNewAccountFromEntry(page)
    await expectScreen(page, 'B4_BACKUP_SUCCESS')
    expect(await authenticator.countCredentials()).toBe(1)
    // recordCreateCalls wraps the rejecting wrapper: first the eval attempt, then the enable-only attempt
    expect(await readCreateCalls(page)).toEqual([{ hasPrfEval: true }, { hasPrfEval: false }])
    expect(await readErrorCodes(page)).toEqual(['PASSKEY_CANCELLED'])
  })

  test('a provider that rejects every registration shows "failed", never "cancelled", with the real message and the failing step', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => message.type() === 'error' && consoleErrors.push(message.text()))
    const authenticator = await addVirtualAuthenticator(page)
    await page.addInitScript(() => {
      navigator.credentials.create = () => Promise.reject(new Error('Vault is locked'))
    })
    await openInteractionStory(page, 'one-provider')
    await startRecordingScreens(page)

    await startNewAccountFromEntry(page)
    await expectScreen(page, 'D2_PASSKEY_CANCELLED')
    const failedCard = page.getByTestId('screen-D2')
    await expect(failedCard).toContainText('Passkey request failed')
    await expect(failedCard).not.toContainText('cancelled')
    await expect(failedCard.getByRole('button', { name: 'Back to login methods', exact: true })).toBeVisible()
    expect(await readErrorCodes(page)).toEqual(['PASSKEY_CANCELLED', 'PASSKEY_FAILED'])
    await expect(page.getByTestId(EVENT_LOG)).toContainText('create-prf-enable-only: Error: Vault is locked (after create: Error: Vault is locked)')
    // The console carries the readable summary and the thrown Error itself
    expect(consoleErrors.some((text) => text.includes('PASSKEY_FAILED') && text.includes('Vault is locked'))).toBe(true)
    expect(consoleErrors.some((text) => text.startsWith('[passkey-login-widget]') && text.includes('Error: Vault is locked'))).toBe(true)
    expect(await authenticator.countCredentials()).toBe(0)

    // Retry re-runs the failed step (A4), not the whole login
    await pressButton(page, 'Retry')
    await expectScreen(page, 'D2_PASSKEY_CANCELLED')
    expect((await readRecordedScreens(page)).slice(-3)).toEqual(['D2_PASSKEY_CANCELLED', 'A4_CREATE_PASSKEY', 'D2_PASSKEY_CANCELLED'])
  })
})

test.describe('the follow-up assertion after registration fails', () => {
  test('the passkey stays, Retry only repeats the follow-up assertion and no second passkey is created', async ({ page }) => {
    const authenticator = await addVirtualAuthenticator(page)
    await stubPrfEnabledOnlyAtRegistration(page)
    await recordCreateCalls(page)
    await page.addInitScript(() => {
      // The first assertion after registration is rejected by the provider with a plain Error
      const getWithAuthenticator = navigator.credentials.get.bind(navigator.credentials)
      let hasRegistered = false
      let hasRejectedFollowUp = false
      const createWithAuthenticator = navigator.credentials.create.bind(navigator.credentials)
      navigator.credentials.create = async (options) => {
        const credential = await createWithAuthenticator(options)
        hasRegistered = true
        return credential
      }
      navigator.credentials.get = (options) => {
        if (hasRegistered && !hasRejectedFollowUp) {
          hasRejectedFollowUp = true
          return Promise.reject(new Error('Passkey manager has no such credential'))
        }
        return getWithAuthenticator(options)
      }
    })
    await openInteractionStory(page, 'one-provider')

    await startNewAccountFromEntry(page)
    await expectScreen(page, 'D2_PASSKEY_CANCELLED')
    await expect(page.getByTestId('screen-D2')).toContainText('Passkey request failed')
    expect(await readErrorCodes(page)).toEqual(['PASSKEY_CANCELLED', 'PASSKEY_FAILED'])
    await expect(page.getByTestId(EVENT_LOG)).toContainText('prf-followup-get: Error: Passkey manager has no such credential')
    expect(await authenticator.countCredentials()).toBe(1)

    await pressButton(page, 'Retry')
    await expectScreen(page, 'B4_BACKUP_SUCCESS')
    expect(await authenticator.countCredentials()).toBe(1)
    expect(await readCreateCalls(page)).toHaveLength(1)
  })
})

test.describe('an existing passkey request is rejected with a plain Error', () => {
  test('login shows "failed" with the get step, Retry re-runs it and "Create new account" stays available', async ({ page }) => {
    await addVirtualAuthenticator(page)
    await page.addInitScript(() => {
      navigator.credentials.get = () => Promise.reject(new Error('Extension context invalidated'))
    })
    await openInteractionStory(page, 'one-provider')

    await pressButton(page, 'Continue with passkey')
    await expectScreen(page, 'D2_PASSKEY_CANCELLED')
    await expect(page.getByTestId('screen-D2')).toContainText('Passkey request failed')
    expect(await readErrorCodes(page)).toEqual(['PASSKEY_FAILED'])
    await expect(page.getByTestId(EVENT_LOG)).toContainText('get: Error: Extension context invalidated')
    await expect(page.getByRole('button', { name: 'Create new account', exact: true })).toBeVisible()

    await pressButton(page, 'Retry')
    await expectScreen(page, 'D2_PASSKEY_CANCELLED')
    expect(await readErrorCodes(page)).toEqual(['PASSKEY_FAILED', 'PASSKEY_FAILED'])
  })
})
