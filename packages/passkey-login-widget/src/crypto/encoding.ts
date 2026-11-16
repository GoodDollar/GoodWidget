/**
 * Byte <-> text encodings used by the backup format and file names.
 * Decoders are strict: anything that is not canonical output of the matching encoder throws.
 */

/** Byte array backed by a plain ArrayBuffer, which is what WebCrypto/WebAuthn accept as BufferSource. */
export type Bytes = Uint8Array<ArrayBuffer>

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/

/** Standard base64 (with padding), used for the `iv` and `ciphertext` backup fields. */
export function encodeBase64(bytes: Bytes): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

/** Strict inverse of `encodeBase64`; throws on invalid or non-canonical input. */
export function decodeBase64(text: string): Bytes {
  if (!BASE64_PATTERN.test(text) || text.length % 4 !== 0) {
    throw new Error('Invalid base64')
  }
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  if (encodeBase64(bytes) !== text) {
    throw new Error('Non-canonical base64')
  }
  return bytes
}

/** URL-safe base64 without padding, used for the `prfTag` in backup file names. */
export function encodeBase64Url(bytes: Bytes): string {
  return encodeBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Strict inverse of `encodeBase64Url`. */
export function decodeBase64Url(text: string): Bytes {
  if (!BASE64URL_PATTERN.test(text)) {
    throw new Error('Invalid base64url')
  }
  const padding = '='.repeat((4 - (text.length % 4)) % 4)
  return decodeBase64(text.replace(/-/g, '+').replace(/_/g, '/') + padding)
}

/** Lowercase 0x-prefixed hex of the given bytes. */
export function bytesToHex(bytes: Bytes): `0x${string}` {
  let hex = '0x'
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0')
  }
  return hex as `0x${string}`
}

/** Bytes of a 0x-prefixed hex string; throws when the string is not valid hex of even length. */
export function hexToBytes(hex: string): Bytes {
  if (!/^0x([0-9a-fA-F]{2})*$/.test(hex)) {
    throw new Error('Invalid hex')
  }
  const bytes = new Uint8Array((hex.length - 2) / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(2 + index * 2, 4 + index * 2), 16)
  }
  return bytes
}
