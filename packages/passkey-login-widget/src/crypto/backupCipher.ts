import { BackupDecryptError } from './backupErrors.ts'
import { bytesToHex, hexToBytes, type Bytes } from './encoding.ts'
import type { HexString } from '../widgetRuntimeContract.ts'

/** AES-GCM nonce length in bytes (96 bit, as recommended for GCM). */
export const BACKUP_IV_BYTE_LENGTH = 12

const textEncoder = new TextEncoder()

export interface EncryptedPayload {
  iv: Bytes
  /** AES-GCM output including the 16-byte authentication tag. */
  ciphertext: Bytes
}

/** The address is bound to the ciphertext as AES-GCM additional data, so the pair cannot be swapped. */
function additionalDataForAddress(address: HexString): Bytes {
  return textEncoder.encode(address.toLowerCase())
}

/** Encrypts the private key with a fresh random IV on every call. */
export async function encryptPrivateKey(
  privateKey: HexString,
  address: HexString,
  encryptionKey: CryptoKey,
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(BACKUP_IV_BYTE_LENGTH))
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: additionalDataForAddress(address) },
    encryptionKey,
    hexToBytes(privateKey),
  )
  return { iv, ciphertext: new Uint8Array(ciphertextBuffer) }
}

/** Decrypts the private key; any wrong key, tampered data or wrong address surfaces as `BackupDecryptError`. */
export async function decryptPrivateKey(
  payload: EncryptedPayload,
  address: HexString,
  encryptionKey: CryptoKey,
): Promise<HexString> {
  try {
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: payload.iv, additionalData: additionalDataForAddress(address) },
      encryptionKey,
      payload.ciphertext,
    )
    return bytesToHex(new Uint8Array(plaintextBuffer))
  } catch {
    throw new BackupDecryptError('Backup could not be decrypted with this passkey')
  }
}
