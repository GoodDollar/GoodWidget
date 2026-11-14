import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { bytesToHex } from './encoding.ts'
import {
  addressOfPrivateKey,
  deriveAccountKey,
  deriveBackupEncryptionKey,
  deriveBackupFileTag,
  toValidAccountKey,
} from './prfDerivation.ts'
import { createFakePrfOutput } from '../testFixtures.ts'

describe('PRF derivation', () => {
  it('derives the same account key and file tag from the same passkey', async () => {
    const prfOutput = createFakePrfOutput(1)
    assert.equal(await deriveAccountKey(prfOutput), await deriveAccountKey(createFakePrfOutput(1)))
    assert.equal(
      await deriveBackupFileTag(prfOutput, 'example.org'),
      await deriveBackupFileTag(createFakePrfOutput(1), 'example.org'),
    )
  })

  it('derives a 32-byte hex account key that is different for different passkeys', async () => {
    const firstKey = await deriveAccountKey(createFakePrfOutput(1))
    const secondKey = await deriveAccountKey(createFakePrfOutput(2))
    assert.match(firstKey, /^0x[0-9a-f]{64}$/)
    assert.notEqual(firstKey, secondKey)
  })

  it('separates the account key, the file tag and the encryption key by label', async () => {
    const prfOutput = createFakePrfOutput(3)
    const accountKey = await deriveAccountKey(prfOutput)
    const fileTag = await deriveBackupFileTag(prfOutput, 'example.org')
    assert.equal(fileTag.length, 22)
    assert.ok(!accountKey.includes(fileTag))
    const encryptionKey = await deriveBackupEncryptionKey(prfOutput)
    assert.equal(encryptionKey.extractable, false)
    assert.deepEqual(encryptionKey.usages.sort(), ['decrypt', 'encrypt'])
  })

  it('makes the file tag specific to the rpId', async () => {
    const prfOutput = createFakePrfOutput(4)
    assert.notEqual(await deriveBackupFileTag(prfOutput, 'a.example.org'), await deriveBackupFileTag(prfOutput, 'b.example.org'))
  })

  it('produces a base64url file tag without padding', async () => {
    assert.match(await deriveBackupFileTag(createFakePrfOutput(5), 'example.org'), /^[A-Za-z0-9_-]{22}$/)
  })

  it('rejects scalars that are zero or not below the curve order', () => {
    assert.throws(() => toValidAccountKey(new Uint8Array(32)))
    const curveOrderBytes = Uint8Array.from(
      Buffer.from('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141', 'hex'),
    )
    assert.throws(() => toValidAccountKey(curveOrderBytes))
    assert.throws(() => toValidAccountKey(new Uint8Array(32).fill(255)))
    assert.throws(() => toValidAccountKey(new Uint8Array(31).fill(1)))
  })

  it('accepts the largest valid scalar (order - 1)', () => {
    const largestValidBytes = Uint8Array.from(
      Buffer.from('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140', 'hex'),
    )
    assert.equal(toValidAccountKey(largestValidBytes), bytesToHex(largestValidBytes))
  })

  it('returns a lowercase address for a private key', () => {
    const address = addressOfPrivateKey(`0x${'11'.repeat(32)}`)
    assert.match(address, /^0x[0-9a-f]{40}$/)
  })
})
