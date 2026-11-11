import { BackupDecryptError, BackupFormatError } from './backupErrors.ts'
import { BACKUP_IV_BYTE_LENGTH, decryptPrivateKey, encryptPrivateKey } from './backupCipher.ts'
import { addressOfPrivateKey } from './prfDerivation.ts'
import { decodeBase64, encodeBase64 } from './encoding.ts'
import type { HexString } from '../widgetRuntimeContract.ts'

/** The only backup format version. Older/newer versions are rejected, there are no compatibility shims. */
export const BACKUP_FORMAT_VERSION = 1

/** 32-byte private key plus the 16-byte AES-GCM tag. */
const MINIMUM_CIPHERTEXT_BYTE_LENGTH = 48

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/

/** Shape of the JSON file stored with the provider. */
export interface BackupFileContent {
  version: number
  address: HexString
  /** base64, 12 bytes */
  iv: string
  /** base64, AES-GCM output including the tag */
  ciphertext: string
}

/** Encrypts the account key and returns the versioned backup JSON to upload. */
export async function createBackupJson(privateKey: HexString, encryptionKey: CryptoKey): Promise<string> {
  const address = addressOfPrivateKey(privateKey)
  const { iv, ciphertext } = await encryptPrivateKey(privateKey, address, encryptionKey)
  const content: BackupFileContent = {
    version: BACKUP_FORMAT_VERSION,
    address,
    iv: encodeBase64(iv),
    ciphertext: encodeBase64(ciphertext),
  }
  return JSON.stringify(content)
}

/** Parses and validates backup JSON; throws `BackupFormatError` for anything that is not a valid v1 backup. */
export function parseBackupJson(backupJson: string): BackupFileContent {
  let parsed: unknown
  try {
    parsed = JSON.parse(backupJson)
  } catch {
    throw new BackupFormatError('Backup is not valid JSON')
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new BackupFormatError('Backup is not an object')
  }
  const { version, address, iv, ciphertext } = parsed as Record<string, unknown>
  if (version !== BACKUP_FORMAT_VERSION) {
    throw new BackupFormatError(`Unsupported backup version: ${String(version)}`)
  }
  if (typeof address !== 'string' || !ADDRESS_PATTERN.test(address)) {
    throw new BackupFormatError('Backup address is invalid')
  }
  if (typeof iv !== 'string' || typeof ciphertext !== 'string') {
    throw new BackupFormatError('Backup is missing iv or ciphertext')
  }
  try {
    if (decodeBase64(iv).length !== BACKUP_IV_BYTE_LENGTH) {
      throw new Error('Wrong IV length')
    }
    if (decodeBase64(ciphertext).length < MINIMUM_CIPHERTEXT_BYTE_LENGTH) {
      throw new Error('Ciphertext too short')
    }
  } catch {
    throw new BackupFormatError('Backup iv or ciphertext is invalid')
  }
  return { version, address: address.toLowerCase() as HexString, iv, ciphertext }
}

/**
 * Decrypts a backup and verifies that the recovered key reproduces the stored address.
 * Wrong passkey, corrupted data and address mismatch all throw (`BackupDecryptError`).
 */
export async function restorePrivateKeyFromBackupJson(
  backupJson: string,
  encryptionKey: CryptoKey,
): Promise<{ privateKey: HexString; address: HexString }> {
  const content = parseBackupJson(backupJson)
  const privateKey = await decryptPrivateKey(
    { iv: decodeBase64(content.iv), ciphertext: decodeBase64(content.ciphertext) },
    content.address,
    encryptionKey,
  )
  if (addressOfPrivateKey(privateKey) !== content.address) {
    throw new BackupDecryptError('Decrypted key does not match the backup address')
  }
  return { privateKey, address: content.address }
}
