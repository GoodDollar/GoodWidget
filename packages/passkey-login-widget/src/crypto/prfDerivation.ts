import { privateKeyToAddress } from 'viem/accounts'
import { encodeBase64Url, bytesToHex, type Bytes } from './encoding.ts'
import type { HexString } from '../widgetRuntimeContract.ts'

/**
 * Fixed, versioned PRF input. Changing it changes every derived value, so a new
 * version means a new account family and must be a deliberate format bump.
 */
export const PRF_SALT_TEXT = 'goodwidget:passkey-login:prf:v1'

/** HKDF `info` labels. Each derivation has its own label so none reveals anything about the others. */
export const ACCOUNT_KEY_LABEL = 'goodwidget/passkey-login/v1/account-key'
export const BACKUP_ENCRYPTION_KEY_LABEL = 'goodwidget/passkey-login/v1/backup-encryption-key'
export const BACKUP_FILE_TAG_LABEL = 'goodwidget/passkey-login/v1/backup-file-tag'

const ACCOUNT_KEY_BYTE_LENGTH = 32
const BACKUP_FILE_TAG_BYTE_LENGTH = 16

/** Order of the secp256k1 group; a valid private key is an integer in [1, order - 1]. */
const SECP256K1_CURVE_ORDER = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n

const textEncoder = new TextEncoder()

/**
 * HKDF-SHA-256 over the PRF output.
 * @param prfOutput  secret PRF bytes (kept in memory only)
 * @param label      domain-separation label (HKDF info)
 * @param salt       HKDF salt; empty when the derivation is not site-specific
 * @param byteLength number of bytes to derive
 */
async function hkdfSha256(
  prfOutput: Bytes,
  label: string,
  salt: Bytes,
  byteLength: number,
): Promise<Bytes> {
  const inputKey = await crypto.subtle.importKey('raw', prfOutput, 'HKDF', false, ['deriveBits'])
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: textEncoder.encode(label) },
    inputKey,
    byteLength * 8,
  )
  return new Uint8Array(derivedBits)
}

/** Returns the key as hex when it is a valid secp256k1 scalar; throws otherwise. */
export function toValidAccountKey(keyBytes: Bytes): HexString {
  const keyHex = bytesToHex(keyBytes)
  const keyScalar = BigInt(keyHex)
  if (keyBytes.length !== ACCOUNT_KEY_BYTE_LENGTH || keyScalar === 0n || keyScalar >= SECP256K1_CURVE_ORDER) {
    throw new Error('Derived bytes are not a valid secp256k1 private key')
  }
  return keyHex
}

/** 32-byte account private key for a NEW account, derived from the passkey PRF output. */
export async function deriveAccountKey(prfOutput: Bytes): Promise<HexString> {
  const keyBytes = await hkdfSha256(prfOutput, ACCOUNT_KEY_LABEL, new Uint8Array(0), ACCOUNT_KEY_BYTE_LENGTH)
  return toValidAccountKey(keyBytes)
}

/** AES-256-GCM key that encrypts the account key in the backup file. Non-extractable. */
export async function deriveBackupEncryptionKey(prfOutput: Bytes): Promise<CryptoKey> {
  const keyBytes = await hkdfSha256(prfOutput, BACKUP_ENCRYPTION_KEY_LABEL, new Uint8Array(0), 32)
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

/**
 * `prfTag`: one-way 22-character base64url tag, unique per passkey AND per rpId
 * (rpId is the HKDF salt). Used in backup file names to find the backup of this passkey.
 */
export async function deriveBackupFileTag(prfOutput: Bytes, rpId: string): Promise<string> {
  const tagBytes = await hkdfSha256(
    prfOutput,
    BACKUP_FILE_TAG_LABEL,
    textEncoder.encode(rpId),
    BACKUP_FILE_TAG_BYTE_LENGTH,
  )
  return encodeBase64Url(tagBytes)
}

/** Lowercase public address of a private key. */
export function addressOfPrivateKey(privateKey: HexString): HexString {
  return privateKeyToAddress(privateKey).toLowerCase() as HexString
}
