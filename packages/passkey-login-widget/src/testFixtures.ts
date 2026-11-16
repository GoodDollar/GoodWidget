import type { Bytes } from './crypto/encoding.ts'
import { ProviderAuthError } from './storage/storageAdapter.ts'
import type { PasskeyBackupStorage, PasskeyProviderId } from './widgetRuntimeContract.ts'

/** Deterministic stand-in for a passkey PRF output; `seed` makes a different "passkey". */
export function createFakePrfOutput(seed: number): Bytes {
  return Uint8Array.from({ length: 32 }, (_, index) => (index * 7 + seed) % 256)
}

export interface InMemoryStorageControls {
  /** File name -> backup JSON currently stored. */
  files: Map<string, string>
  /** Make `authorize` fail with a provider auth error. */
  failAuthorization: boolean
  /** Make `writeBackup` fail with a plain error. */
  failWrites: boolean
}

/** In-memory `PasskeyBackupStorage` used by unit tests; behaves like a provider with an exact name lookup. */
export function createInMemoryStorage(
  id: PasskeyProviderId = 'google-drive',
): PasskeyBackupStorage & InMemoryStorageControls {
  const storage: PasskeyBackupStorage & InMemoryStorageControls = {
    id,
    label: id === 'google-drive' ? 'Google Drive' : 'iCloud',
    files: new Map<string, string>(),
    failAuthorization: false,
    failWrites: false,
    async authorize() {
      if (storage.failAuthorization) {
        throw new ProviderAuthError('sign-in failed')
      }
    },
    async listBackupNames(prfTag) {
      return [...storage.files.keys()].filter((name) => name.startsWith(`gwpk-${prfTag}-`))
    },
    async readBackup(fileName) {
      return storage.files.get(fileName) ?? null
    },
    async writeBackup(fileName, backupJson) {
      if (storage.failWrites) {
        throw new Error('write failed')
      }
      storage.files.set(fileName, backupJson)
    },
  }
  return storage
}
