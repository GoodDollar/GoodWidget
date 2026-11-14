import { filterBackupNamesByTag, buildBackupFileName, parseBackupFileName } from '../crypto/backupFileName.ts'
import { BackupDecryptError } from '../crypto/backupErrors.ts'
import { createBackupJson, restorePrivateKeyFromBackupJson } from '../crypto/backupFormat.ts'
import type { Bytes } from '../crypto/encoding.ts'
import { addressOfPrivateKey, deriveBackupEncryptionKey, deriveBackupFileTag } from '../crypto/prfDerivation.ts'
import { ProviderAuthError } from '../storage/storageAdapter.ts'
import { PASSKEY_ERROR_MESSAGES, PasskeyFlowError } from '../webauthn/passkeyErrors.ts'
import type { HexString, PasskeyBackupStorage } from '../widgetRuntimeContract.ts'

/**
 * UI-free building blocks of the flow: prepare an encrypted backup, upload it, restore it.
 * They only ever hand ciphertext to a storage adapter.
 */

export interface PreparedBackup {
  address: HexString
  fileName: string
  /** Versioned backup JSON; ciphertext only. */
  backupJson: string
}

export interface RestoredAccount {
  privateKey: HexString
  address: HexString
}

/** Encrypts `privateKey` for this passkey and names the file `gwpk-<prfTag>-<address>.json`. */
export async function prepareAccountBackup(options: {
  privateKey: HexString
  prfOutput: Bytes
  rpId: string
}): Promise<PreparedBackup> {
  const { privateKey, prfOutput, rpId } = options
  const address = addressOfPrivateKey(privateKey)
  const prfTag = await deriveBackupFileTag(prfOutput, rpId)
  const encryptionKey = await deriveBackupEncryptionKey(prfOutput)
  return {
    address,
    fileName: buildBackupFileName(prfTag, address),
    backupJson: await createBackupJson(privateKey, encryptionKey),
  }
}

/**
 * Signs in to the provider. Whatever `authorize` throws (blocked SDK script, blocked popup, rejected client ID,
 * a custom adapter's own error) means "could not sign in", so it becomes a `ProviderAuthError` and ends on D4.
 */
async function authorizeProvider(provider: PasskeyBackupStorage): Promise<void> {
  try {
    await provider.authorize()
  } catch (error) {
    if (error instanceof ProviderAuthError) {
      throw error
    }
    throw new ProviderAuthError(error instanceof Error ? error.message : 'Provider sign-in failed')
  }
}

/** Signs in to the provider and writes the prepared backup (replacing a file with the same name). */
export async function uploadPreparedBackup(provider: PasskeyBackupStorage, backup: PreparedBackup): Promise<void> {
  await authorizeProvider(provider)
  await provider.writeBackup(backup.fileName, backup.backupJson)
}

/**
 * Finds this passkey's backup at the provider and decrypts it.
 * 0 matches -> BACKUP_NOT_FOUND, more than 1 -> AMBIGUOUS_BACKUP. The decrypted key must reproduce
 * both the address inside the file and the address in the file name, otherwise decrypt fails.
 * @param onBackupFound called once the backup file has been located (drives the progress screen)
 */
export async function restoreAccountFromProvider(options: {
  provider: PasskeyBackupStorage
  prfOutput: Bytes
  rpId: string
  onBackupFound?: () => void
}): Promise<RestoredAccount> {
  const { provider, prfOutput, rpId, onBackupFound } = options
  await authorizeProvider(provider)

  const prfTag = await deriveBackupFileTag(prfOutput, rpId)
  const matchingFileNames = filterBackupNamesByTag(await provider.listBackupNames(prfTag), prfTag)
  if (matchingFileNames.length === 0) {
    throw new PasskeyFlowError('BACKUP_NOT_FOUND', PASSKEY_ERROR_MESSAGES.BACKUP_NOT_FOUND)
  }
  if (matchingFileNames.length > 1) {
    throw new PasskeyFlowError('AMBIGUOUS_BACKUP', PASSKEY_ERROR_MESSAGES.AMBIGUOUS_BACKUP)
  }
  const [backupFileName] = matchingFileNames
  onBackupFound?.()

  const backupJson = await provider.readBackup(backupFileName)
  if (backupJson === null) {
    throw new PasskeyFlowError('BACKUP_NOT_FOUND', PASSKEY_ERROR_MESSAGES.BACKUP_NOT_FOUND)
  }
  const restoredAccount = await restorePrivateKeyFromBackupJson(backupJson, await deriveBackupEncryptionKey(prfOutput))
  // The file name is only a hint; a forged name must not log anyone into a different account
  if (parseBackupFileName(backupFileName)?.address !== restoredAccount.address) {
    throw new BackupDecryptError('Backup file name does not match the decrypted account')
  }
  return restoredAccount
}
