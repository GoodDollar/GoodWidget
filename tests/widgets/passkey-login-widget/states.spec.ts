import { expect, test } from '@playwright/test'

const FIXTURE_STORY_PREFIX = '/iframe.html?id=qa-passkeyloginwidget-screen-fixtures--'

// Every screen is checked in both themes so light/dark parity stays covered.
const THEMES = ['light', 'dark'] as const

interface ScreenFixture {
  /** Storybook story id suffix of the fixture. */
  storyId: string
  /** `data-screen` value the widget root must report. */
  screen: string
  /** `data-testid` of the screen card. */
  cardTestId: string
  /** Texts the screen must show. */
  texts: string[]
  /** Names of the buttons the screen must offer. */
  buttons: string[]
  /** Screenshot file name, without theme folder or extension. */
  screenshotName: string
}

const SCREEN_FIXTURES: ScreenFixture[] = [
  { storyId: 'a-1-entry', screen: 'A1_ENTRY', cardTestId: 'screen-A1', texts: ['Sign in with passkey'], buttons: ['Continue with passkey', 'Use another login method'], screenshotName: 'pl-a1-entry' },
  { storyId: 'a-2-authenticating', screen: 'A2_AUTHENTICATING', cardTestId: 'screen-A2', texts: ['Sign in with passkey'], buttons: [], screenshotName: 'pl-a2-authenticating' },
  { storyId: 'a-3-new-account-warning', screen: 'A3_NEW_ACCOUNT_WARNING', cardTestId: 'screen-A3', texts: ['Create new account'], buttons: ['Create new account', 'Back to login methods'], screenshotName: 'pl-a3-new-account-warning' },
  { storyId: 'a-4-create-passkey', screen: 'A4_CREATE_PASSKEY', cardTestId: 'screen-A4', texts: ['Creating your passkey'], buttons: [], screenshotName: 'pl-a4-create-passkey' },
  { storyId: 'b-1-backup-prompt', screen: 'B1_BACKUP_PROMPT', cardTestId: 'screen-B1', texts: ['Back up your account with a passkey'], buttons: ['Set up passkey backup', 'Not now'], screenshotName: 'pl-b1-backup-prompt' },
  { storyId: 'b-2-backup-provider', screen: 'B2_BACKUP_PROVIDER', cardTestId: 'screen-B2', texts: ['Choose where to back up', 'Google Drive', 'iCloud'], buttons: ['Continue'], screenshotName: 'pl-b2-backup-provider' },
  { storyId: 'b-3-backup-progress', screen: 'B3_BACKUP_PROGRESS', cardTestId: 'screen-B3', texts: ['Backing up your account'], buttons: [], screenshotName: 'pl-b3-backup-progress' },
  { storyId: 'b-4-backup-success', screen: 'B4_BACKUP_SUCCESS', cardTestId: 'screen-B4', texts: ['Backup complete', 'Your account is backed up to Google Drive.'], buttons: ['Continue'], screenshotName: 'pl-b4-backup-success' },
  { storyId: 'c-1-restore-provider', screen: 'C1_RESTORE_PROVIDER', cardTestId: 'screen-C1', texts: ['Where is your backup?', 'Google Drive', 'iCloud'], buttons: [], screenshotName: 'pl-c1-restore-provider' },
  { storyId: 'c-2-restore-progress', screen: 'C2_RESTORE_PROGRESS', cardTestId: 'screen-C2', texts: ['Restoring your account'], buttons: [], screenshotName: 'pl-c2-restore-progress' },
  { storyId: 'c-3-restore-success', screen: 'C3_RESTORE_SUCCESS', cardTestId: 'screen-C3', texts: ['Welcome back', 'Your account has been restored.'], buttons: ['Continue'], screenshotName: 'pl-c3-restore-success' },
  { storyId: 'd-1-unsupported-browser', screen: 'D1_UNSUPPORTED_BROWSER', cardTestId: 'screen-D1', texts: [], buttons: ['Back to login methods'], screenshotName: 'pl-d1-unsupported-browser' },
  { storyId: 'd-2-passkey-cancelled', screen: 'D2_PASSKEY_CANCELLED', cardTestId: 'screen-D2', texts: ['Passkey request cancelled'], buttons: ['Retry', 'Create new account'], screenshotName: 'pl-d2-passkey-cancelled' },
  { storyId: 'd-2-passkey-failed', screen: 'D2_PASSKEY_CANCELLED', cardTestId: 'screen-D2', texts: ['Passkey request failed', 'passkey provider returned an error'], buttons: ['Retry', 'Back to login methods'], screenshotName: 'pl-d2-passkey-failed' },
  { storyId: 'd-3-backup-not-found', screen: 'D3_BACKUP_NOT_FOUND', cardTestId: 'screen-D3', texts: ['No backup found in Google Drive'], buttons: ['Try the other provider', 'Back'], screenshotName: 'pl-d3-backup-not-found' },
  { storyId: 'd-3-backup-not-found-single-provider', screen: 'D3_BACKUP_NOT_FOUND', cardTestId: 'screen-D3', texts: ['No backup found in Google Drive'], buttons: ['Back'], screenshotName: 'pl-d3-backup-not-found-single-provider' },
  { storyId: 'd-4-provider-auth-failed', screen: 'D4_PROVIDER_AUTH_FAILED', cardTestId: 'screen-D4', texts: ["Couldn't connect to Google Drive"], buttons: ['Try again', 'Choose another provider'], screenshotName: 'pl-d4-provider-auth-failed' },
  { storyId: 'd-5-backup-failed-new-user', screen: 'D5_BACKUP_FAILED', cardTestId: 'screen-D5', texts: ['Backup failed. Your account is not backed up yet.'], buttons: ['Retry'], screenshotName: 'pl-d5-backup-failed-new-user' },
  { storyId: 'd-5-backup-failed-existing-user', screen: 'D5_BACKUP_FAILED', cardTestId: 'screen-D5', texts: ['Backup failed. Your account is not backed up yet.'], buttons: ['Retry', 'Skip for now'], screenshotName: 'pl-d5-backup-failed-existing-user' },
  { storyId: 'd-6-decrypt-failed', screen: 'D6_DECRYPT_FAILED', cardTestId: 'screen-D6', texts: [], buttons: ['Try again', 'Back'], screenshotName: 'pl-d6-decrypt-failed' },
  { storyId: 'd-6-ambiguous-backup', screen: 'D6_DECRYPT_FAILED', cardTestId: 'screen-D6', texts: ['More than one backup matches this passkey'], buttons: ['Try again', 'Back'], screenshotName: 'pl-d6-ambiguous-backup' },
]

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    for (const fixture of SCREEN_FIXTURES) {
      test(`${fixture.screenshotName} renders ${fixture.screen}`, async ({ page }) => {
        await page.setViewportSize({ width: 440, height: 800 })
        await page.goto(`${FIXTURE_STORY_PREFIX}${fixture.storyId}&viewMode=story&args=themeMode:${theme}`)

        const widgetRoot = page.getByTestId('passkey-login-widget')
        await expect(widgetRoot).toHaveAttribute('data-screen', fixture.screen, { timeout: 20_000 })
        await expect(page.getByTestId(fixture.cardTestId)).toBeVisible()
        for (const text of fixture.texts) {
          await expect(widgetRoot.getByText(text, { exact: false }).first()).toBeVisible()
        }
        for (const buttonName of fixture.buttons) {
          await expect(widgetRoot.getByRole('button', { name: buttonName, exact: true })).toBeVisible()
        }

        await page.screenshot({
          path: `tests/widgets/passkey-login-widget/test-results/${theme}/${fixture.screenshotName}.png`,
          fullPage: true,
        })
      })
    }
  })
}
