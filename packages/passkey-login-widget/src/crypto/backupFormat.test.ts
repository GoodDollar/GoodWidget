import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { decryptPrivateKey } from './backupCipher.ts'
import { BackupDecryptError, BackupFormatError } from './backupErrors.ts'
import { buildBackupFileName, filterBackupNamesByTag, parseBackupFileName } from './backupFileName.ts'
import { createBackupJson, parseBackupJson, restorePrivateKeyFromBackupJson } from './backupFormat.ts'
import { decodeBase64, decodeBase64Url, encodeBase64, hexToBytes } from './encoding.ts'
import { addressOfPrivateKey, deriveBackupEncryptionKey } from './prfDerivation.ts'
import { createFakePrfOutput } from '../testFixtures.ts'

const PRIVATE_KEY = `0x${'22'.repeat(32)}` as const
const OTHER_PRIVATE_KEY = `0x${'33'.repeat(32)}` as const

describe('backup file names', () => {
  const prfTag = 'abcdefghijklmnopqrstuv'
  const address = addressOfPrivateKey(PRIVATE_KEY)

  it('builds and parses gwpk-<prfTag>-<address>.json with a lowercase address', () => {
    const fileName = buildBackupFileName(prfTag, address.toUpperCase().replace('0X', '0x') as typeof address)
    assert.equal(fileName, `gwpk-${prfTag}-${address}.json`)
    assert.deepEqual(parseBackupFileName(fileName), { prfTag, address })
  })

  it('rejects names this widget did not write', () => {
    assert.equal(parseBackupFileName('notes.json'), null)
    assert.equal(parseBackupFileName(`gwpk-short-${address}.json`), null)
    assert.equal(parseBackupFileName(`gwpk-${prfTag}-${address}.txt`), null)
    assert.equal(parseBackupFileName(`gwpk-${prfTag}-0xZZ.json`), null)
  })

  it('keeps only the names of the given passkey', () => {
    const ownName = buildBackupFileName(prfTag, address)
    const foreignName = buildBackupFileName('zzzzzzzzzzzzzzzzzzzzzz', address)
    assert.deepEqual(filterBackupNamesByTag([ownName, foreignName, 'unrelated.json'], prfTag), [ownName])
  })
})

describe('encoding', () => {
  it('rejects non-canonical base64 and base64url', () => {
    assert.throws(() => decodeBase64('AB=='))
    assert.throws(() => decodeBase64('A'))
    assert.throws(() => decodeBase64Url('a+b'))
    assert.deepEqual(decodeBase64(encodeBase64(new Uint8Array([1, 2, 3]))), new Uint8Array([1, 2, 3]))
  })

  it('rejects malformed hex', () => {
    assert.throws(() => hexToBytes('0x123'))
    assert.throws(() => hexToBytes('12'))
  })
})

describe('backup JSON', () => {
  async function createBackupFor(privateKey: typeof PRIVATE_KEY, passkeySeed: number) {
    const encryptionKey = await deriveBackupEncryptionKey(createFakePrfOutput(passkeySeed))
    return { backupJson: await createBackupJson(privateKey, encryptionKey), encryptionKey }
  }

  it('round-trips the private key and writes the documented v1 shape', async () => {
    const { backupJson, encryptionKey } = await createBackupFor(PRIVATE_KEY, 1)
    const content = JSON.parse(backupJson)
    assert.deepEqual(Object.keys(content).sort(), ['address', 'ciphertext', 'iv', 'version'])
    assert.equal(content.version, 1)
    assert.equal(content.address, addressOfPrivateKey(PRIVATE_KEY))
    assert.equal(decodeBase64(content.iv).length, 12)
    assert.ok(!backupJson.includes(PRIVATE_KEY.slice(2)))

    const restored = await restorePrivateKeyFromBackupJson(backupJson, encryptionKey)
    assert.deepEqual(restored, { privateKey: PRIVATE_KEY, address: addressOfPrivateKey(PRIVATE_KEY) })
  })

  it('uses a fresh IV for every backup of the same key', async () => {
    const first = JSON.parse((await createBackupFor(PRIVATE_KEY, 1)).backupJson)
    const second = JSON.parse((await createBackupFor(PRIVATE_KEY, 1)).backupJson)
    assert.notEqual(first.iv, second.iv)
    assert.notEqual(first.ciphertext, second.ciphertext)
  })

  it('fails to decrypt with another passkey', async () => {
    const { backupJson } = await createBackupFor(PRIVATE_KEY, 1)
    const wrongPasskeyKey = await deriveBackupEncryptionKey(createFakePrfOutput(2))
    await assert.rejects(restorePrivateKeyFromBackupJson(backupJson, wrongPasskeyKey), BackupDecryptError)
  })

  it('fails when the ciphertext was tampered with', async () => {
    const { backupJson, encryptionKey } = await createBackupFor(PRIVATE_KEY, 1)
    const content = JSON.parse(backupJson)
    const tamperedBytes = decodeBase64(content.ciphertext)
    tamperedBytes[0] ^= 1
    const tamperedJson = JSON.stringify({ ...content, ciphertext: encodeBase64(tamperedBytes) })
    await assert.rejects(restorePrivateKeyFromBackupJson(tamperedJson, encryptionKey), BackupDecryptError)
  })

  it('fails when the stored address was swapped (address is authenticated data)', async () => {
    const { backupJson, encryptionKey } = await createBackupFor(PRIVATE_KEY, 1)
    const swappedJson = JSON.stringify({ ...JSON.parse(backupJson), address: addressOfPrivateKey(OTHER_PRIVATE_KEY) })
    await assert.rejects(restorePrivateKeyFromBackupJson(swappedJson, encryptionKey), BackupDecryptError)
  })

  it('fails when the decrypted key does not belong to the stored address', async () => {
    const encryptionKey = await deriveBackupEncryptionKey(createFakePrfOutput(1))
    const wrongAddress = addressOfPrivateKey(OTHER_PRIVATE_KEY)
    // Encrypt PRIVATE_KEY but label it with another address: AAD matches, the key/address check must still fail
    const { encryptPrivateKey } = await import('./backupCipher.ts')
    const { iv, ciphertext } = await encryptPrivateKey(PRIVATE_KEY, wrongAddress, encryptionKey)
    const mismatchedJson = JSON.stringify({ version: 1, address: wrongAddress, iv: encodeBase64(iv), ciphertext: encodeBase64(ciphertext) })
    assert.equal(await decryptPrivateKey({ iv, ciphertext }, wrongAddress, encryptionKey), PRIVATE_KEY)
    await assert.rejects(restorePrivateKeyFromBackupJson(mismatchedJson, encryptionKey), BackupDecryptError)
  })

  it('rejects malformed backups', async () => {
    const { backupJson } = await createBackupFor(PRIVATE_KEY, 1)
    const content = JSON.parse(backupJson)
    const malformedBackups = [
      'not json',
      '[]',
      JSON.stringify({ ...content, version: 2 }),
      JSON.stringify({ ...content, version: undefined }),
      JSON.stringify({ ...content, address: '0x123' }),
      JSON.stringify({ ...content, iv: encodeBase64(new Uint8Array(8)) }),
      JSON.stringify({ ...content, ciphertext: encodeBase64(new Uint8Array(10)) }),
      JSON.stringify({ ...content, ciphertext: 7 }),
    ]
    for (const malformedBackup of malformedBackups) {
      assert.throws(() => parseBackupJson(malformedBackup), BackupFormatError)
    }
  })
})
