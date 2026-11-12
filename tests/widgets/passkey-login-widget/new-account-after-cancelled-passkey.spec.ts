import { expect, test, type Page } from '@playwright/test'
import { addVirtualAuthenticator } from './webauthnFixture'
import { installFakeGoogleDrive } from './fakeGoogleDrive'
import {
  expectScreen,
  openInteractionStory,
  openLiveStoryWithGoogleDrive,
  pressButton,
  readErrorCodes,
  readHostEvents,
  readRecordedScreens,
  readStoredBackupNames,
  setStorageFailure,
  startRecordingScreens,
  type InteractionStory,
} from './interactionHelpers'

/**
 * Regression for the Live-story bug reported on PR #308: choosing "Create new account" after a cancelled
 * passkey request landed on D5 "Backup failed" before any passkey existed.
 */

const HEX_PRIVATE_KEY = /^0x[0-9a-f]{64}$/

/** Presses "Continue with passkey" on a fresh authenticator: the get() finds no passkey and ends on D2. */
async function reachD2ThroughCancelledPasskeyRequest(page: Page): Promise<void> {
  await expectScreen(page, 'A1_ENTRY')
  await pressButton(page, 'Continue with passkey')
  await expectScreen(page, 'D2_PASSKEY_CANCELLED')
}

/** Asserts onLogin fired once with a key for a new account. */
async function expectNewAccountLogin(page: Page): Promise<void> {
  const loginEvents = (await readHostEvents(page)).filter((event) => event.name === 'login')
  expect(loginEvents).toHaveLength(1)
  expect(loginEvents[0].detail?.isNewAccount).toBe(true)
  expect(loginEvents[0].detail?.privateKey).toMatch(HEX_PRIVATE_KEY)
}

test.describe('D2 -> "Create new account" runs the whole new-account journey (mock storage)', () => {
  const journeys: { story: InteractionStory; providerToChoose?: 'google-drive'; expectedScreens: string[] }[] = [
    {
      story: 'one-provider',
      expectedScreens: ['A1_ENTRY', 'A2_AUTHENTICATING', 'D2_PASSKEY_CANCELLED', 'A3_NEW_ACCOUNT_WARNING', 'A4_CREATE_PASSKEY', 'B3_BACKUP_PROGRESS', 'B4_BACKUP_SUCCESS'],
    },
    {
      story: 'two-providers',
      providerToChoose: 'google-drive',
      expectedScreens: ['A1_ENTRY', 'A2_AUTHENTICATING', 'D2_PASSKEY_CANCELLED', 'A3_NEW_ACCOUNT_WARNING', 'A4_CREATE_PASSKEY', 'B2_BACKUP_PROVIDER', 'B3_BACKUP_PROGRESS', 'B4_BACKUP_SUCCESS'],
    },
  ]

  for (const { story, providerToChoose, expectedScreens } of journeys) {
    test(`${story}: a passkey is created before any backup step and onLogin reports a new account`, async ({ page }) => {
      const authenticator = await addVirtualAuthenticator(page)
      await openInteractionStory(page, story)
      await startRecordingScreens(page)

      await reachD2ThroughCancelledPasskeyRequest(page)
      // Nothing has been created yet and no backup was attempted
      expect(await authenticator.countCredentials()).toBe(0)
      await pressButton(page, 'Create new account')
      await expectScreen(page, 'A3_NEW_ACCOUNT_WARNING')
      expect(await authenticator.countCredentials()).toBe(0)
      await pressButton(page, 'Create new account')

      if (providerToChoose) {
        await expectScreen(page, 'B2_BACKUP_PROVIDER')
        // The passkey already exists when the provider is chosen
        expect(await authenticator.countCredentials()).toBe(1)
        await page.getByTestId(`provider-tile-${providerToChoose}`).click()
        await pressButton(page, 'Continue')
      }
      await expectScreen(page, 'B4_BACKUP_SUCCESS')

      expect(await readRecordedScreens(page)).toEqual(expectedScreens)
      expect(await authenticator.countCredentials()).toBe(1)
      expect(await readStoredBackupNames(page, 'google-drive')).toHaveLength(1)
      // D5 never appeared and the only error was the first cancelled request
      expect(await readErrorCodes(page)).toEqual(['PASSKEY_CANCELLED'])

      await pressButton(page, 'Continue')
      await expectNewAccountLogin(page)
    })
  }
})

test.describe('D5 appears only after the passkey exists, and Retry resumes at the upload', () => {
  test('a failed write after passkey creation retries the upload without a second passkey', async ({ page }) => {
    const authenticator = await addVirtualAuthenticator(page)
    await openInteractionStory(page, 'one-provider')
    await startRecordingScreens(page)
    await setStorageFailure(page, 'google-drive', 'failWrites', true)

    await reachD2ThroughCancelledPasskeyRequest(page)
    await pressButton(page, 'Create new account')
    await pressButton(page, 'Create new account')
    await expectScreen(page, 'D5_BACKUP_FAILED')
    expect(await authenticator.countCredentials()).toBe(1)
    expect(await readErrorCodes(page)).toEqual(['PASSKEY_CANCELLED', 'BACKUP_FAILED'])

    await setStorageFailure(page, 'google-drive', 'failWrites', false)
    await pressButton(page, 'Retry')
    await expectScreen(page, 'B4_BACKUP_SUCCESS')
    // Retry re-ran B3 (no A4 in between), so still exactly one passkey
    expect((await readRecordedScreens(page)).slice(-4)).toEqual(['B3_BACKUP_PROGRESS', 'D5_BACKUP_FAILED', 'B3_BACKUP_PROGRESS', 'B4_BACKUP_SUCCESS'])
    expect(await authenticator.countCredentials()).toBe(1)
    await pressButton(page, 'Continue')
    await expectNewAccountLogin(page)
  })
})

test.describe('a passkey request that cannot run is never reported as a failed backup', () => {
  test('an origin that is not a valid rpId (IP address host) ends on D1 with no passkey and no BACKUP_FAILED', async ({ page, baseURL }) => {
    const authenticator = await addVirtualAuthenticator(page)
    const ipAddressOrigin = (baseURL ?? 'http://localhost:6006').replace('localhost', '127.0.0.1')
    await page.setViewportSize({ width: 440, height: 900 })
    await page.goto(`${ipAddressOrigin}/iframe.html?id=qa-passkeyloginwidget-interactions--one-provider&viewMode=story`)
    await expect(page.getByTestId('passkey-login-widget')).toBeVisible({ timeout: 20_000 })
    await startRecordingScreens(page)

    // WebAuthn rejects the rpId with SecurityError, which is not a user cancellation either
    await pressButton(page, 'Continue with passkey')
    await expectScreen(page, 'D1_UNSUPPORTED_BROWSER')
    expect(await authenticator.countCredentials()).toBe(0)
  })
})

test.describe('real Google Drive adapter on the Live story (fake Google SDK and Drive API)', () => {
  test('D2 -> "Create new account" with a single configured provider backs up to Drive and logs in as a new account', async ({ page }) => {
    const authenticator = await addVirtualAuthenticator(page)
    const fakeDrive = await installFakeGoogleDrive(page, 'grant-only-with-user-gesture')
    await openLiveStoryWithGoogleDrive(page)
    await startRecordingScreens(page)

    await reachD2ThroughCancelledPasskeyRequest(page)
    await pressButton(page, 'Create new account')
    await pressButton(page, 'Create new account')
    await expectScreen(page, 'B4_BACKUP_SUCCESS')

    expect(await readRecordedScreens(page)).toEqual([
      'A1_ENTRY', 'A2_AUTHENTICATING', 'D2_PASSKEY_CANCELLED', 'A3_NEW_ACCOUNT_WARNING', 'A4_CREATE_PASSKEY', 'B3_BACKUP_PROGRESS', 'B4_BACKUP_SUCCESS',
    ])
    expect(await authenticator.countCredentials()).toBe(1)
    expect([...fakeDrive.files.keys()]).toHaveLength(1)
    expect(await fakeDrive.signInRequestCount()).toBe(1)
    await pressButton(page, 'Continue')
    const logText = await page.getByTestId('passkey-event-log').innerText()
    expect(logText).toContain('login → address 0x')
    expect(logText).toContain('isNewAccount true')
    expect(logText).not.toContain('BACKUP_FAILED')
  })

  for (const brokenSignIn of ['denied', 'script-blocked', 'init-throws'] as const) {
    test(`Google sign-in "${brokenSignIn}" after the passkey was created shows D4, and Try again resumes at the upload`, async ({ page }) => {
      const authenticator = await addVirtualAuthenticator(page)
      const fakeDrive = await installFakeGoogleDrive(page, brokenSignIn)
      await openLiveStoryWithGoogleDrive(page)

      await reachD2ThroughCancelledPasskeyRequest(page)
      await pressButton(page, 'Create new account')
      await pressButton(page, 'Create new account')

      // A sign-in problem is a provider problem (D4), never a failed backup (D5)
      await expectScreen(page, 'D4_PROVIDER_AUTH_FAILED')
      expect(await readErrorCodes(page)).toEqual(['PASSKEY_CANCELLED', 'PROVIDER_AUTH_FAILED'])
      expect(await authenticator.countCredentials()).toBe(1)
      expect(await page.getByTestId('passkey-event-log').innerText()).not.toContain('login →')

      await fakeDrive.setSignInMode('grant')
      await pressButton(page, 'Try again')
      await expectScreen(page, 'B4_BACKUP_SUCCESS')
      // The retry only signed in and uploaded: no second passkey
      expect(await authenticator.countCredentials()).toBe(1)
      expect(fakeDrive.files.size).toBe(1)
    })
  }
})
