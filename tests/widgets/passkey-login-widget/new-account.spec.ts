import { expect, test } from '@playwright/test'
import { addVirtualAuthenticator, stubPrfEnabledOnlyAtRegistration } from './webauthnFixture'
import {
  createAccountAndBackUp,
  expectScreen,
  openInteractionStory,
  pressButton,
  readHostEvents,
  readStoredBackup,
  readStoredBackupNames,
} from './interactionHelpers'

const HEX_PRIVATE_KEY = /^0x[0-9a-f]{64}$/
const BACKUP_FILE_NAME = /^gwpk-[A-Za-z0-9_-]+-0x[0-9a-f]{40}\.json$/

test('a new account is created, backed up and handed to the host', async ({ page }) => {
  const authenticator = await addVirtualAuthenticator(page)
  await openInteractionStory(page, 'one-provider')

  await expectScreen(page, 'A1_ENTRY')
  await pressButton(page, 'Continue with passkey')
  await expectScreen(page, 'D2_PASSKEY_CANCELLED')
  await pressButton(page, 'Create new account')
  await expectScreen(page, 'A3_NEW_ACCOUNT_WARNING')
  await pressButton(page, 'Create new account')

  // One provider: B2 is skipped. The backup is written before the host learns about the account.
  await expectScreen(page, 'B4_BACKUP_SUCCESS')
  await expect(page.getByTestId('screen-B4')).toContainText('Your account is backed up to Google Drive.')
  expect(await authenticator.countCredentials()).toBe(1)
  const storedNames = await readStoredBackupNames(page, 'google-drive')
  expect(storedNames).toHaveLength(1)
  expect(storedNames[0]).toMatch(BACKUP_FILE_NAME)
  expect((await readHostEvents(page)).map((event) => event.name)).toEqual(['error'])

  await pressButton(page, 'Continue')
  const hostEvents = await readHostEvents(page)
  const loginEvent = hostEvents.find((event) => event.name === 'login')
  const backupEvent = hostEvents.find((event) => event.name === 'backup-complete')
  expect(loginEvent?.detail?.isNewAccount).toBe(true)
  expect(loginEvent?.detail?.privateKey).toMatch(HEX_PRIVATE_KEY)
  expect(backupEvent?.detail?.provider).toBe('google-drive')
  expect(backupEvent?.detail?.address).toBe(loginEvent?.detail?.address)
  // The backup file is named after the address the host received
  expect(storedNames[0]).toContain(String(loginEvent?.detail?.address).toLowerCase())
  // The backup-complete payload never carries the key
  expect(JSON.stringify(backupEvent?.detail)).not.toContain('privateKey')
})

test('the stored backup is an encrypted v1 envelope without the key', async ({ page }) => {
  await addVirtualAuthenticator(page)
  await openInteractionStory(page, 'one-provider')
  await createAccountAndBackUp(page)

  const [fileName] = await readStoredBackupNames(page, 'google-drive')
  const backupJson = await readStoredBackup(page, 'google-drive', fileName)
  const backup = JSON.parse(backupJson ?? '{}') as Record<string, unknown>
  const loginEvent = (await readHostEvents(page)).find((event) => event.name === 'login')

  expect(Object.keys(backup).sort()).toEqual(['address', 'ciphertext', 'iv', 'version'])
  expect(backup.version).toBe(1)
  expect(String(backup.address).toLowerCase()).toBe(String(loginEvent?.detail?.address).toLowerCase())
  expect(backupJson).not.toContain(String(loginEvent?.detail?.privateKey).slice(2))
})

test('the new-account warning says a NEW account is created and points to the backup route and "Back to login methods" skips', async ({ page }) => {
  await addVirtualAuthenticator(page)
  await openInteractionStory(page, 'one-provider')
  await pressButton(page, 'Continue with passkey')
  await expectScreen(page, 'D2_PASSKEY_CANCELLED')
  await pressButton(page, 'Create new account')
  await expectScreen(page, 'A3_NEW_ACCOUNT_WARNING')
  await expect(page.getByTestId('screen-A3')).toContainText('Continuing will create a NEW account.')
  await expect(page.getByTestId('screen-A3')).toContainText('Already have an account with Google, Facebook or SMS?')

  await pressButton(page, 'Back to login methods')
  expect((await readHostEvents(page)).map((event) => event.name)).toEqual(['error', 'skip'])
})

test('a passkey that reports PRF only at registration gets a follow-up assertion', async ({ page }) => {
  const authenticator = await addVirtualAuthenticator(page)
  await stubPrfEnabledOnlyAtRegistration(page)
  await openInteractionStory(page, 'one-provider')

  await createAccountAndBackUp(page)

  const loginEvent = (await readHostEvents(page)).find((event) => event.name === 'login')
  expect(loginEvent?.detail?.privateKey).toMatch(HEX_PRIVATE_KEY)
  expect(await authenticator.countCredentials()).toBe(1)
  expect(await readStoredBackupNames(page, 'google-drive')).toHaveLength(1)
})
