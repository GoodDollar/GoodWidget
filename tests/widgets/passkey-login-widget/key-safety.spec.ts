import { expect, test, type Page } from '@playwright/test'
import { addVirtualAuthenticator } from './webauthnFixture'
import {
  REMEMBERED_PROVIDER_STORAGE_KEY,
  createAccountAndBackUp,
  expectScreen,
  openInteractionStory,
  pressButton,
  readHostEvents,
  readStoredBackup,
  readStoredBackupNames,
} from './interactionHelpers'

/** Window hook that records the PRF output of every WebAuthn call, so the spec knows what must never leak. */
interface PrfSpyWindow {
  __prfOutputsBase64?: string[]
}

/** Wraps `navigator.credentials.create/get` to record PRF outputs (test-only spy; the widget code is untouched). */
async function recordPrfOutputs(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spyWindow = window as unknown as PrfSpyWindow
    spyWindow.__prfOutputsBase64 = []
    const credentials = navigator.credentials
    for (const methodName of ['create', 'get'] as const) {
      const originalMethod = credentials[methodName].bind(credentials) as (options?: unknown) => Promise<unknown>
      ;(credentials as unknown as Record<string, unknown>)[methodName] = async (options?: unknown) => {
        const credential = (await originalMethod(options)) as PublicKeyCredential | null
        const prfResults = (credential?.getClientExtensionResults() as { prf?: { results?: { first?: ArrayBuffer } } })
          ?.prf?.results
        if (prfResults?.first) {
          spyWindow.__prfOutputsBase64?.push(btoa(String.fromCharCode(...new Uint8Array(prfResults.first))))
        }
        return credential
      }
    }
  })
}

/** Console output of the page, collected for the whole test. */
function collectConsoleText(page: Page): string[] {
  const consoleLines: string[] = []
  page.on('console', (message) => consoleLines.push(message.text()))
  page.on('pageerror', (error) => consoleLines.push(String(error)))
  return consoleLines
}

/** Every representation of a secret a leak could take: hex with/without 0x, base64 and base64url. */
function secretRepresentations(secretBytesHex: string, secretBase64: string): string[] {
  const hexWithoutPrefix = secretBytesHex.replace(/^0x/, '')
  const base64Url = secretBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return [hexWithoutPrefix, `0x${hexWithoutPrefix}`, secretBase64, base64Url]
}

function base64ToHex(valueBase64: string): string {
  return Buffer.from(valueBase64, 'base64').toString('hex')
}

/** Text the page exposes to anything but the host callback: DOM, both web storages and the console. */
async function readEverythingVisibleToThePage(page: Page, consoleLines: string[]): Promise<string> {
  const domAndStorage = await page.evaluate(() =>
    JSON.stringify({
      html: document.documentElement.outerHTML,
      localStorage: { ...localStorage },
      sessionStorage: { ...sessionStorage },
    }),
  )
  return `${domAndStorage}\n${consoleLines.join('\n')}`
}

test('neither the account key nor the PRF output leaks outside the login callback and the encrypted backup', async ({ page }) => {
  const consoleLines = collectConsoleText(page)
  await recordPrfOutputs(page)
  await addVirtualAuthenticator(page)
  await openInteractionStory(page, 'one-provider')
  await createAccountAndBackUp(page)

  // Second session: restore through the passkey, so both the create and the restore paths are covered
  await page.getByRole('button', { name: 'Restart widget' }).click()
  await expectScreen(page, 'A1_ENTRY')
  await pressButton(page, 'Continue with passkey')
  await expectScreen(page, 'C3_RESTORE_SUCCESS')
  await pressButton(page, 'Continue')

  const hostEvents = await readHostEvents(page)
  const loginEvents = hostEvents.filter((event) => event.name === 'login')
  const accountPrivateKey = loginEvents[0].detail?.privateKey as string
  expect(accountPrivateKey).toMatch(/^0x[0-9a-f]{64}$/)

  const prfOutputsBase64 = await page.evaluate(() => (window as unknown as PrfSpyWindow).__prfOutputsBase64 ?? [])
  expect(prfOutputsBase64.length).toBeGreaterThan(0)

  const forbiddenValues = [
    ...secretRepresentations(accountPrivateKey, Buffer.from(accountPrivateKey.slice(2), 'hex').toString('base64')),
    ...prfOutputsBase64.flatMap((prfOutputBase64) => secretRepresentations(base64ToHex(prfOutputBase64), prfOutputBase64)),
  ]

  // 1. DOM, web storage and console never contain the key or the PRF output
  const pageVisibleText = await readEverythingVisibleToThePage(page, consoleLines)
  for (const forbiddenValue of forbiddenValues) {
    expect(pageVisibleText).not.toContain(forbiddenValue)
  }

  // 2. Only the remembered provider id is persisted by the widget
  const storedKeys = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)])
  expect(storedKeys.filter((storedKey) => storedKey.startsWith('goodwidget.'))).toEqual([REMEMBERED_PROVIDER_STORAGE_KEY])

  // 3. The uploaded file is versioned JSON of ciphertext only, with a name made of tag and address
  const backupNames = await readStoredBackupNames(page, 'google-drive')
  expect(backupNames).toHaveLength(1)
  expect(backupNames[0]).toMatch(/^gwpk-[A-Za-z0-9_-]{22}-0x[0-9a-f]{40}\.json$/)
  const backupJson = (await readStoredBackup(page, 'google-drive', backupNames[0])) as string
  expect(Object.keys(JSON.parse(backupJson)).sort()).toEqual(['address', 'ciphertext', 'iv', 'version'])
  for (const forbiddenValue of forbiddenValues) {
    expect(backupJson).not.toContain(forbiddenValue)
    expect(backupNames[0]).not.toContain(forbiddenValue)
  }

  // 4. Only `onLogin` carries the key; both logins (create and restore) hand over the same key
  expect(loginEvents[1].detail?.privateKey).toBe(accountPrivateKey)
  const eventsWithoutLogin = hostEvents.filter((event) => event.name !== 'login')
  for (const forbiddenValue of forbiddenValues) {
    expect(JSON.stringify(eventsWithoutLogin)).not.toContain(forbiddenValue)
  }
})

test('the event log of the story masks the key that onLogin delivers', async ({ page }) => {
  await addVirtualAuthenticator(page)
  await openInteractionStory(page, 'one-provider')
  await createAccountAndBackUp(page)

  await expect(page.getByTestId('passkey-event-log')).toContainText('privateKey ••••••••')
  const accountPrivateKey = (await readHostEvents(page)).find((event) => event.name === 'login')?.detail?.privateKey as string
  await expect(page.getByTestId('passkey-event-log')).not.toContainText(accountPrivateKey.slice(2))
})
