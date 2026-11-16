import { expect, test, type Page } from '@playwright/test'
import { addVirtualAuthenticator } from './webauthnFixture'
import {
  createAccountAndBackUp,
  expectScreen,
  openInteractionStory,
  pressButton,
  readHostEvents,
  readStoredBackupNames,
  REMEMBERED_PROVIDER_STORAGE_KEY,
} from './interactionHelpers'

/** Walks A1 -> D2 -> A3 -> A4 so the widget stands on B2 with a freshly created passkey. */
async function reachBackupProviderChoice(page: Page): Promise<void> {
  await pressButton(page, 'Continue with passkey')
  await expectScreen(page, 'D2_PASSKEY_CANCELLED')
  await pressButton(page, 'Create new account')
  await pressButton(page, 'Create new account')
  await expectScreen(page, 'B2_BACKUP_PROVIDER')
}

test('B2 offers radio tiles, preselects the first provider and backs up to the chosen one', async ({ page }) => {
  await addVirtualAuthenticator(page)
  await openInteractionStory(page, 'two-providers')
  await reachBackupProviderChoice(page)

  const driveTile = page.getByTestId('provider-tile-google-drive')
  const iCloudTile = page.getByTestId('provider-tile-icloud')
  await expect(page.getByRole('radiogroup', { name: 'Backup provider' })).toBeVisible()
  await expect(driveTile).toHaveAttribute('role', 'radio')
  await expect(driveTile).toHaveAttribute('aria-checked', 'true')
  await expect(iCloudTile).toHaveAttribute('aria-checked', 'false')

  // Keyboard: focus the iCloud tile and activate it
  await iCloudTile.focus()
  await page.keyboard.press('Enter')
  await expect(iCloudTile).toHaveAttribute('aria-checked', 'true')
  await expect(driveTile).toHaveAttribute('aria-checked', 'false')

  await pressButton(page, 'Continue')
  await expectScreen(page, 'B4_BACKUP_SUCCESS')
  await expect(page.getByTestId('screen-B4')).toContainText('Your account is backed up to iCloud.')
  expect(await readStoredBackupNames(page, 'icloud')).toHaveLength(1)
  expect(await readStoredBackupNames(page, 'google-drive')).toHaveLength(0)
})

test('the chosen provider is remembered (id only) and skips the provider choice on the next login', async ({ page }) => {
  await addVirtualAuthenticator(page)
  await openInteractionStory(page, 'two-providers')
  await createAccountAndBackUp(page, 'icloud')

  const rememberedValue = await page.evaluate((key) => window.localStorage.getItem(key), REMEMBERED_PROVIDER_STORAGE_KEY)
  expect(rememberedValue).toBe('icloud')

  await page.getByRole('button', { name: 'Restart widget' }).click()
  await pressButton(page, 'Continue with passkey')
  // Remembered: no C1, the restore goes straight to the remembered provider
  await expectScreen(page, 'C3_RESTORE_SUCCESS')
  await pressButton(page, 'Continue')
  expect((await readHostEvents(page)).filter((event) => event.name === 'login')[1].detail?.isNewAccount).toBe(false)
})

test('C1 asks for the provider when none is remembered', async ({ page }) => {
  await addVirtualAuthenticator(page)
  await openInteractionStory(page, 'two-providers')
  await createAccountAndBackUp(page, 'google-drive')

  // Forget the provider: the next login must ask where the backup is
  await page.evaluate((key) => window.localStorage.removeItem(key), REMEMBERED_PROVIDER_STORAGE_KEY)
  await page.getByRole('button', { name: 'Restart widget' }).click()
  await pressButton(page, 'Continue with passkey')
  await expectScreen(page, 'C1_RESTORE_PROVIDER')
  await expect(page.getByTestId('provider-tile-google-drive')).toBeVisible()
  await expect(page.getByTestId('provider-tile-icloud')).toBeVisible()

  await page.getByTestId('provider-tile-google-drive').click()
  await expectScreen(page, 'C3_RESTORE_SUCCESS')
})

test('D3 "Try the other provider" leads back to C1 and the backup is found there', async ({ page }) => {
  await addVirtualAuthenticator(page)
  await openInteractionStory(page, 'two-providers')
  await createAccountAndBackUp(page, 'icloud')

  // The backup lives in iCloud, but the user remembers Google Drive
  await page.evaluate((key) => window.localStorage.setItem(key, 'google-drive'), REMEMBERED_PROVIDER_STORAGE_KEY)
  await page.getByRole('button', { name: 'Restart widget' }).click()
  await pressButton(page, 'Continue with passkey')
  await expectScreen(page, 'D3_BACKUP_NOT_FOUND')
  await expect(page.getByTestId('screen-D3')).toContainText('No backup found in Google Drive')

  await pressButton(page, 'Try the other provider')
  await expectScreen(page, 'C1_RESTORE_PROVIDER')
  await page.getByTestId('provider-tile-icloud').click()
  await expectScreen(page, 'C3_RESTORE_SUCCESS')
})

test('a single configured provider never shows a provider choice, even when nothing is remembered', async ({ page }) => {
  await addVirtualAuthenticator(page)
  await openInteractionStory(page, 'one-provider')
  await createAccountAndBackUp(page)

  await page.evaluate((key) => window.localStorage.removeItem(key), REMEMBERED_PROVIDER_STORAGE_KEY)
  await page.getByRole('button', { name: 'Restart widget' }).click()
  await pressButton(page, 'Continue with passkey')
  await expectScreen(page, 'C3_RESTORE_SUCCESS')
})
