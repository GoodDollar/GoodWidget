import { expect, type Page } from '@playwright/test'

const INTERACTION_STORY_PREFIX = '/iframe.html?id=qa-passkeyloginwidget-interactions--'

/** Key of the remembered provider in localStorage (an id only, never key material). */
export const REMEMBERED_PROVIDER_STORAGE_KEY = 'goodwidget.passkey-login.provider'

/** Interaction stories: the real widget on in-memory storage. */
export type InteractionStory =
  | 'one-provider'
  | 'two-providers'
  | 'existing-user-one-provider'
  | 'existing-user-two-providers'

/** Host callback recorded by the interaction story harness (mock-only payloads). */
export interface RecordedHostEvent {
  name: string
  detail?: { address?: string; privateKey?: string; isNewAccount?: boolean; provider?: string; code?: string }
}

/** Shape of the `window.__passkeyStory` hook the interaction stories create. */
interface StoryWindow {
  __passkeyStory?: {
    events: RecordedHostEvent[]
    storages: Record<string, { controls: { files: Map<string, string>; failAuthorization: boolean; failWrites: boolean } }>
  }
}

export async function openInteractionStory(page: Page, story: InteractionStory): Promise<void> {
  await page.setViewportSize({ width: 440, height: 900 })
  await page.goto(`${INTERACTION_STORY_PREFIX}${story}&viewMode=story`)
  await expect(page.getByTestId('passkey-login-widget')).toBeVisible({ timeout: 20_000 })
}

/** Waits until the widget shows the given screen (`data-screen` of the widget root). */
export async function expectScreen(page: Page, screen: string): Promise<void> {
  await expect(page.getByTestId('passkey-login-widget')).toHaveAttribute('data-screen', screen, { timeout: 15_000 })
}

export async function pressButton(page: Page, buttonName: string): Promise<void> {
  await page.getByTestId('passkey-login-widget').getByRole('button', { name: buttonName, exact: true }).click()
}

export async function readHostEvents(page: Page): Promise<RecordedHostEvent[]> {
  return page.evaluate(() => (window as unknown as StoryWindow).__passkeyStory?.events ?? [])
}

/** Backup file names currently stored in the mock storage of one provider. */
export async function readStoredBackupNames(page: Page, providerId: string): Promise<string[]> {
  return page.evaluate((id) => [...((window as unknown as StoryWindow).__passkeyStory?.storages[id]?.controls.files.keys() ?? [])], providerId)
}

/** Raw backup JSON of one stored file. */
export async function readStoredBackup(page: Page, providerId: string, fileName: string): Promise<string | undefined> {
  return page.evaluate(
    ([id, name]) => (window as unknown as StoryWindow).__passkeyStory?.storages[id]?.controls.files.get(name),
    [providerId, fileName],
  )
}

/**
 * Runs the "new account" journey from A1 up to and including the Continue press on B4.
 * @param chosenProviderId provider to pick on B2; omit when only one provider is offered (B2 is skipped)
 */
export async function createAccountAndBackUp(page: Page, chosenProviderId?: 'google-drive' | 'icloud'): Promise<void> {
  await expectScreen(page, 'A1_ENTRY')
  await pressButton(page, 'Continue with passkey')
  // A fresh authenticator has no passkey yet, so the request ends on D2, which offers a new account
  await expectScreen(page, 'D2_PASSKEY_CANCELLED')
  await pressButton(page, 'Create new account')
  await expectScreen(page, 'A3_NEW_ACCOUNT_WARNING')
  await pressButton(page, 'Create new account')
  if (chosenProviderId) {
    await expectScreen(page, 'B2_BACKUP_PROVIDER')
    await page.getByTestId(`provider-tile-${chosenProviderId}`).click()
    await pressButton(page, 'Continue')
  }
  await expectScreen(page, 'B4_BACKUP_SUCCESS')
  await pressButton(page, 'Continue')
}

/** Flips a failure switch of one mock provider storage. */
export async function setStorageFailure(
  page: Page,
  providerId: string,
  failure: 'failAuthorization' | 'failWrites',
  isFailing: boolean,
): Promise<void> {
  await page.evaluate(
    ([id, failureName, value]) => {
      const storage = (window as unknown as StoryWindow).__passkeyStory?.storages[id as string]
      if (storage) {
        storage.controls[failureName as 'failAuthorization' | 'failWrites'] = value as boolean
      }
    },
    [providerId, failure, isFailing],
  )
}

/** Replaces everything stored by one mock provider with the given file name -> JSON entries. */
export async function replaceStoredBackups(
  page: Page,
  providerId: string,
  backups: Record<string, string>,
): Promise<void> {
  await page.evaluate(
    ([id, entries]) => {
      const storage = (window as unknown as StoryWindow).__passkeyStory?.storages[id as string]
      if (storage) {
        storage.controls.files = new Map(Object.entries(entries as Record<string, string>))
      }
    },
    [providerId, backups],
  )
}
