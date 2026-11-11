import { expect, test } from '@playwright/test'
import { addVirtualAuthenticator } from './webauthnFixture'
import { expectScreen, openInteractionStory, pressButton, readHostEvents, readStoredBackupNames } from './interactionHelpers'

test('an existing user backs up their account with a fresh passkey and is not logged in again', async ({ page }) => {
  const authenticator = await addVirtualAuthenticator(page)
  await openInteractionStory(page, 'existing-user-one-provider')

  await expectScreen(page, 'B1_BACKUP_PROMPT')
  await pressButton(page, 'Set up passkey backup')
  await expectScreen(page, 'B4_BACKUP_SUCCESS')
  expect(await authenticator.countCredentials()).toBe(1)
  expect(await readStoredBackupNames(page, 'google-drive')).toHaveLength(1)

  await pressButton(page, 'Continue')
  const hostEvents = await readHostEvents(page)
  // Only the backup result: the user is already logged in, so there is no onLogin
  expect(hostEvents.map((event) => event.name)).toEqual(['backup-complete'])
  expect(hostEvents[0].detail?.provider).toBe('google-drive')
  expect(JSON.stringify(hostEvents[0].detail)).not.toContain('privateKey')
})

test('every backup creates a new passkey and a new backup file', async ({ page }) => {
  const authenticator = await addVirtualAuthenticator(page)
  await openInteractionStory(page, 'existing-user-one-provider')

  for (let backupRun = 0; backupRun < 2; backupRun += 1) {
    await expectScreen(page, 'B1_BACKUP_PROMPT')
    await pressButton(page, 'Set up passkey backup')
    await expectScreen(page, 'B4_BACKUP_SUCCESS')
    await pressButton(page, 'Continue')
    await page.getByRole('button', { name: 'Restart widget' }).click()
  }

  expect(await authenticator.countCredentials()).toBe(2)
  expect(await readStoredBackupNames(page, 'google-drive')).toHaveLength(2)
})

test('"Not now" skips the backup without touching passkeys or storage', async ({ page }) => {
  const authenticator = await addVirtualAuthenticator(page)
  await openInteractionStory(page, 'existing-user-one-provider')

  await expectScreen(page, 'B1_BACKUP_PROMPT')
  await pressButton(page, 'Not now')

  expect((await readHostEvents(page)).map((event) => event.name)).toEqual(['skip'])
  expect(await authenticator.countCredentials()).toBe(0)
  expect(await readStoredBackupNames(page, 'google-drive')).toHaveLength(0)
})
