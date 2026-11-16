import { expect, test } from '@playwright/test'
import { addVirtualAuthenticator } from './webauthnFixture'
import { createAccountAndBackUp, expectScreen, openInteractionStory, pressButton, readHostEvents } from './interactionHelpers'

/** Key of the logged-in user in the interaction stories (a throwaway demo key). */
const DEMO_ACCOUNT_PRIVATE_KEY = '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318'

test('a backed-up account is restored with the same passkey after the widget restarts', async ({ page }) => {
  const authenticator = await addVirtualAuthenticator(page)
  await openInteractionStory(page, 'one-provider')
  await createAccountAndBackUp(page)
  const createdLogin = (await readHostEvents(page)).find((event) => event.name === 'login')

  // New widget session, same passkey and same stored backup
  await page.getByRole('button', { name: 'Restart widget' }).click()
  await expectScreen(page, 'A1_ENTRY')
  await pressButton(page, 'Continue with passkey')
  await expectScreen(page, 'C3_RESTORE_SUCCESS')
  await expect(page.getByTestId('screen-C3')).toContainText('Your account has been restored.')
  expect(await authenticator.countCredentials()).toBe(1)

  await pressButton(page, 'Continue')
  const restoredLogin = (await readHostEvents(page)).filter((event) => event.name === 'login')[1]
  expect(restoredLogin.detail?.isNewAccount).toBe(false)
  expect(restoredLogin.detail?.address).toBe(createdLogin?.detail?.address)
  expect(restoredLogin.detail?.privateKey).toBe(createdLogin?.detail?.privateKey)
})

test('"Use another login method" hands control back to the host', async ({ page }) => {
  await addVirtualAuthenticator(page)
  await openInteractionStory(page, 'one-provider')
  await expectScreen(page, 'A1_ENTRY')

  await pressButton(page, 'Use another login method')
  expect((await readHostEvents(page)).map((event) => event.name)).toEqual(['skip'])
})

test('an account whose key was not derived from the passkey is restored with its exact address', async ({ page }) => {
  await addVirtualAuthenticator(page)
  await openInteractionStory(page, 'existing-user-one-provider')

  // The logged-in user's own key (not derived from any passkey) is backed up with a new passkey
  await pressButton(page, 'Set up passkey backup')
  await expectScreen(page, 'B4_BACKUP_SUCCESS')
  await pressButton(page, 'Continue')
  const backedUpAddress = (await readHostEvents(page)).find((event) => event.name === 'backup-complete')?.detail?.address

  // Logged out again: the passkey alone brings the same account back, found by prfTag listing
  await page.getByRole('button', { name: 'Restart as logged-out user' }).click()
  await expectScreen(page, 'A1_ENTRY')
  await pressButton(page, 'Continue with passkey')
  await expectScreen(page, 'C3_RESTORE_SUCCESS')
  await pressButton(page, 'Continue')

  const restoredLogin = (await readHostEvents(page)).find((event) => event.name === 'login')
  expect(restoredLogin?.detail?.isNewAccount).toBe(false)
  expect(restoredLogin?.detail?.address).toBe(backedUpAddress)
  expect(restoredLogin?.detail?.privateKey).toBe(DEMO_ACCOUNT_PRIVATE_KEY)
})
