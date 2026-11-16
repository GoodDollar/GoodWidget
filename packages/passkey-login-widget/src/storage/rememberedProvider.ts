import type { PasskeyBackupStorage, PasskeyProviderId } from '../widgetRuntimeContract.ts'

/** localStorage key holding the id (and only the id) of the last provider used successfully. */
export const REMEMBERED_PROVIDER_STORAGE_KEY = 'goodwidget.passkey-login.provider'

/**
 * Returns the remembered provider id when it is still one of the offered providers.
 * Browsers that block localStorage simply behave as "nothing remembered".
 */
export function readRememberedProviderId(
  offeredProviders: PasskeyBackupStorage[],
  browserStorage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
): PasskeyProviderId | null {
  try {
    const rememberedId = browserStorage?.getItem(REMEMBERED_PROVIDER_STORAGE_KEY)
    return offeredProviders.find((provider) => provider.id === rememberedId)?.id ?? null
  } catch {
    return null
  }
}

/** Remembers the provider id so the next restore can skip the provider choice. Failures are ignored. */
export function rememberProviderId(
  providerId: PasskeyProviderId,
  browserStorage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage,
): void {
  try {
    browserStorage?.setItem(REMEMBERED_PROVIDER_STORAGE_KEY, providerId)
  } catch {
    // Remembering the provider is a convenience; the flow works without it.
  }
}
