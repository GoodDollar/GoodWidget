import { expect, test, type Page } from '@playwright/test'
import { addVirtualAuthenticator, stubWebAuthnFailure } from './webauthnFixture'
import {
  createAccountAndBackUp,
  expectScreen,
  openInteractionStory,
  pressButton,
  readHostEvents,
  readStoredBackup,
  readStoredBackupNames,
  replaceStoredBackups,
  setStorageFailure,
} from './interactionHelpers'

/** `onError` codes reported to the host so far. */
async function readErrorCodes(page: Page): Promise<(string | undefined)[]> {
  return (await readHostEvents(page)).filter((event) => event.name === 'error').map((event) => event.detail?.code)
}

/** Creates and backs up an account, then restarts the widget so the next step is a login. */
async function createBackedUpAccountAndRestart(page: Page, story: 'one-provider' | 'two-providers'): Promise<void> {
  await openInteractionStory(page, story)
  await createAccountAndBackUp(page, story === 'two-providers' ? 'google-drive' : undefined)
  await page.getByRole('button', { name: 'Restart widget' }).click()
  await expectScreen(page, 'A1_ENTRY')
}

test.describe('D1 unsupported browser', () => {
  test('a browser without WebAuthn goes straight to D1', async ({ page }) => {
    await stubWebAuthnFailure(page, 'no-webauthn')
    await openInteractionStory(page, 'one-provider')

    await expectScreen(page, 'D1_UNSUPPORTED_BROWSER')
    expect(await readErrorCodes(page)).toEqual(['UNSUPPORTED_BROWSER'])
    await pressButton(page, 'Back to login methods')
    expect((await readHostEvents(page)).at(-1)?.name).toBe('skip')
  })

  test('an authenticator without PRF ends on D1', async ({ page }) => {
    await stubWebAuthnFailure(page, 'no-prf')
    await openInteractionStory(page, 'one-provider')

    await pressButton(page, 'Continue with passkey')
    await expectScreen(page, 'D1_UNSUPPORTED_BROWSER')
    expect(await readErrorCodes(page)).toEqual(['UNSUPPORTED_BROWSER'])
  })
})

test.describe('D2 passkey cancelled', () => {
  test('Retry returns to A1 and "Create new account" goes to A3', async ({ page }) => {
    await stubWebAuthnFailure(page, 'user-cancelled')
    await openInteractionStory(page, 'one-provider')

    await pressButton(page, 'Continue with passkey')
    await expectScreen(page, 'D2_PASSKEY_CANCELLED')
    expect(await readErrorCodes(page)).toEqual(['PASSKEY_CANCELLED'])

    // Retry starts over at A1; a second attempt is cancelled again
    await pressButton(page, 'Retry')
    await expectScreen(page, 'A1_ENTRY')
    await pressButton(page, 'Continue with passkey')
    await expectScreen(page, 'D2_PASSKEY_CANCELLED')
    expect(await readErrorCodes(page)).toEqual(['PASSKEY_CANCELLED', 'PASSKEY_CANCELLED'])

    await pressButton(page, 'Create new account')
    await expectScreen(page, 'A3_NEW_ACCOUNT_WARNING')
  })
})

test.describe('D3 backup not found', () => {
  test('a passkey without any backup shows D3 and "Back" returns to A1', async ({ page }) => {
    await addVirtualAuthenticator(page)
    await createBackedUpAccountAndRestart(page, 'one-provider')
    await replaceStoredBackups(page, 'google-drive', {})

    await pressButton(page, 'Continue with passkey')
    await expectScreen(page, 'D3_BACKUP_NOT_FOUND')
    expect(await readErrorCodes(page)).toContain('BACKUP_NOT_FOUND')
    // One provider only: no "other provider" button
    await expect(page.getByRole('button', { name: 'Try the other provider' })).toHaveCount(0)

    await pressButton(page, 'Back')
    await expectScreen(page, 'A1_ENTRY')
  })
})

test.describe('D4 provider sign-in failed', () => {
  test('Try again works once the provider sign-in succeeds, and "Choose another provider" offers C1', async ({ page }) => {
    await addVirtualAuthenticator(page)
    await createBackedUpAccountAndRestart(page, 'two-providers')
    await setStorageFailure(page, 'google-drive', 'failAuthorization', true)

    await pressButton(page, 'Continue with passkey')
    await expectScreen(page, 'D4_PROVIDER_AUTH_FAILED')
    expect(await readErrorCodes(page)).toContain('PROVIDER_AUTH_FAILED')

    await pressButton(page, 'Choose another provider')
    await expectScreen(page, 'C1_RESTORE_PROVIDER')
    await page.getByTestId('provider-tile-google-drive').click()
    await expectScreen(page, 'D4_PROVIDER_AUTH_FAILED')

    await setStorageFailure(page, 'google-drive', 'failAuthorization', false)
    await pressButton(page, 'Try again')
    await expectScreen(page, 'C3_RESTORE_SUCCESS')
  })
})

test.describe('D5 backup failed', () => {
  test('a new user stays logged out, can retry, and has no "Skip for now"', async ({ page }) => {
    await addVirtualAuthenticator(page)
    await openInteractionStory(page, 'one-provider')
    await setStorageFailure(page, 'google-drive', 'failWrites', true)

    await pressButton(page, 'Continue with passkey')
    await pressButton(page, 'Create new account')
    await pressButton(page, 'Create new account')
    await expectScreen(page, 'D5_BACKUP_FAILED')
    expect(await readErrorCodes(page)).toContain('BACKUP_FAILED')
    await expect(page.getByRole('button', { name: 'Skip for now' })).toHaveCount(0)
    // Not logged in: the key stays inside the widget until the backup exists
    expect((await readHostEvents(page)).some((event) => event.name === 'login')).toBe(false)

    await setStorageFailure(page, 'google-drive', 'failWrites', false)
    await pressButton(page, 'Retry')
    await expectScreen(page, 'B4_BACKUP_SUCCESS')
    await pressButton(page, 'Continue')
    const loginEvent = (await readHostEvents(page)).find((event) => event.name === 'login')
    expect(loginEvent?.detail?.isNewAccount).toBe(true)
  })

  test('an existing user can retry or skip', async ({ page }) => {
    const authenticator = await addVirtualAuthenticator(page)
    await openInteractionStory(page, 'existing-user-one-provider')
    await setStorageFailure(page, 'google-drive', 'failWrites', true)

    await pressButton(page, 'Set up passkey backup')
    await expectScreen(page, 'D5_BACKUP_FAILED')
    await pressButton(page, 'Retry')
    // Retry re-uploads the prepared backup without a second passkey prompt
    await expectScreen(page, 'D5_BACKUP_FAILED')
    expect(await authenticator.countCredentials()).toBe(1)

    await pressButton(page, 'Skip for now')
    expect((await readHostEvents(page)).at(-1)?.name).toBe('skip')
  })
})

test.describe('D6 backup cannot be decrypted', () => {
  /** Stored backup of the only account, for the tampering cases. */
  async function readOnlyBackup(page: Page): Promise<{ fileName: string; backup: Record<string, unknown> }> {
    const [fileName] = await readStoredBackupNames(page, 'google-drive')
    const backupJson = await readStoredBackup(page, 'google-drive', fileName)
    return { fileName, backup: JSON.parse(backupJson ?? '{}') as Record<string, unknown> }
  }

  async function expectDecryptFailureAfterTampering(
    page: Page,
    tamper: (stored: { fileName: string; backup: Record<string, unknown> }) => Record<string, string>,
    expectedErrorCode: 'DECRYPT_FAILED' | 'AMBIGUOUS_BACKUP' = 'DECRYPT_FAILED',
  ): Promise<void> {
    await addVirtualAuthenticator(page)
    await createBackedUpAccountAndRestart(page, 'one-provider')
    await replaceStoredBackups(page, 'google-drive', tamper(await readOnlyBackup(page)))

    await pressButton(page, 'Continue with passkey')
    await expectScreen(page, 'D6_DECRYPT_FAILED')
    expect(await readErrorCodes(page)).toContain(expectedErrorCode)
  }

  test('a corrupted ciphertext shows D6', async ({ page }) => {
    await expectDecryptFailureAfterTampering(page, ({ fileName, backup }) => ({
      [fileName]: JSON.stringify({ ...backup, ciphertext: `A${String(backup.ciphertext).slice(1)}` }),
    }))
  })

  test('an address in the file that differs from the file name shows D6', async ({ page }) => {
    await expectDecryptFailureAfterTampering(page, ({ fileName, backup }) => ({
      [fileName]: JSON.stringify({ ...backup, address: '0x0000000000000000000000000000000000000001' }),
    }))
  })

  test('an unknown backup version shows D6', async ({ page }) => {
    await expectDecryptFailureAfterTampering(page, ({ fileName, backup }) => ({
      [fileName]: JSON.stringify({ ...backup, version: 2 }),
    }))
  })

  test('a file name whose address differs from the encrypted address shows D6', async ({ page }) => {
    await expectDecryptFailureAfterTampering(page, ({ fileName, backup }) => ({
      [fileName.replace(/0x[0-9a-f]{40}/, '0x0000000000000000000000000000000000000001')]: JSON.stringify(backup),
    }))
  })

  test('Try again retries and "Back" returns to A1', async ({ page }) => {
    await expectDecryptFailureAfterTampering(page, ({ fileName, backup }) => ({
      [fileName]: JSON.stringify({ ...backup, version: 2 }),
    }))
    await pressButton(page, 'Try again')
    await expectScreen(page, 'D6_DECRYPT_FAILED')
    await pressButton(page, 'Back')
    await expectScreen(page, 'A1_ENTRY')
  })

  test('several backups under one passkey show the ambiguous-backup copy on the D6 layout', async ({ page }) => {
    await expectDecryptFailureAfterTampering(
      page,
      ({ fileName, backup }) => ({
        [fileName]: JSON.stringify(backup),
        [fileName.replace(/0x[0-9a-f]{40}/, '0x0000000000000000000000000000000000000002')]: JSON.stringify(backup),
      }),
      'AMBIGUOUS_BACKUP',
    )
    await expect(page.getByTestId('screen-D6')).toContainText('More than one backup matches this passkey')
  })
})
