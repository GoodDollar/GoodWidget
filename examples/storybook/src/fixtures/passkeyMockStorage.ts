import {
  ProviderAuthError,
  type PasskeyBackupStorage,
  type PasskeyProviderId,
} from '@goodwidget/passkey-login-widget'

/** Failure switches a Playwright spec flips from the page to exercise the D screens. */
export interface MockBackupStorageControls {
  /** File name -> backup JSON currently stored. */
  files: Map<string, string>
  /** Makes `authorize` fail like a closed or denied provider sign-in. */
  failAuthorization: boolean
  /** Makes `writeBackup` fail like a full or unreachable provider. */
  failWrites: boolean
}

export interface MockBackupStorage extends PasskeyBackupStorage {
  controls: MockBackupStorageControls
}

const PROVIDER_LABELS: Record<PasskeyProviderId, string> = {
  'google-drive': 'Google Drive',
  icloud: 'iCloud',
}

/**
 * In-memory stand-in for a Drive / iCloud adapter. It stores the opaque backup JSON the widget
 * hands over, so the widget's real crypto and flow run end to end without a network.
 */
export function createMockBackupStorage(providerId: PasskeyProviderId): MockBackupStorage {
  const controls: MockBackupStorageControls = { files: new Map(), failAuthorization: false, failWrites: false }
  return {
    id: providerId,
    label: PROVIDER_LABELS[providerId],
    controls,
    async authorize() {
      if (controls.failAuthorization) {
        // Adapters signal sign-in problems with ProviderAuthError; the widget shows the provider-auth screen
        throw new ProviderAuthError('Mock provider sign-in failed')
      }
    },
    async listBackupNames(prfTag) {
      return [...controls.files.keys()].filter((fileName) => fileName.startsWith(`gwpk-${prfTag}-`))
    },
    async readBackup(fileName) {
      return controls.files.get(fileName) ?? null
    },
    async writeBackup(fileName, backupJson) {
      if (controls.failWrites) {
        throw new Error('Mock provider write failed')
      }
      controls.files.set(fileName, backupJson)
    },
  }
}
