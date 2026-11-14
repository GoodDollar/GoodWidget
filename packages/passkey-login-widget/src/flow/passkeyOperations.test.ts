import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildBackupFileName } from '../crypto/backupFileName.ts'
import { BackupDecryptError, BackupFormatError } from '../crypto/backupErrors.ts'
import { addressOfPrivateKey, deriveBackupFileTag } from '../crypto/prfDerivation.ts'
import { ProviderAuthError } from '../storage/storageAdapter.ts'
import { PasskeyFlowError } from '../webauthn/passkeyErrors.ts'
import { createFakePrfOutput, createInMemoryStorage } from '../testFixtures.ts'
import { prepareAccountBackup, restoreAccountFromProvider, uploadPreparedBackup } from './passkeyOperations.ts'

const RP_ID = 'example.org'
const PRIVATE_KEY = `0x${'44'.repeat(32)}` as const

/** Backs up PRIVATE_KEY under the given fake passkey and returns what was stored. */
async function backUpWithPasskey(storage: ReturnType<typeof createInMemoryStorage>, passkeySeed: number) {
  const backup = await prepareAccountBackup({ privateKey: PRIVATE_KEY, prfOutput: createFakePrfOutput(passkeySeed), rpId: RP_ID })
  await uploadPreparedBackup(storage, backup)
  return backup
}

describe('backing up', () => {
  it('names the file after the passkey tag and the account address', async () => {
    const storage = createInMemoryStorage()
    const backup = await backUpWithPasskey(storage, 1)
    const prfTag = await deriveBackupFileTag(createFakePrfOutput(1), RP_ID)
    assert.equal(backup.fileName, buildBackupFileName(prfTag, addressOfPrivateKey(PRIVATE_KEY)))
    assert.deepEqual([...storage.files.keys()], [backup.fileName])
  })

  it('replaces the file when the same account is backed up again with the same passkey', async () => {
    const storage = createInMemoryStorage()
    await backUpWithPasskey(storage, 1)
    await backUpWithPasskey(storage, 1)
    assert.equal(storage.files.size, 1)
  })

  it('creates a separate file for every new passkey (one passkey = one account)', async () => {
    const storage = createInMemoryStorage()
    await backUpWithPasskey(storage, 1)
    await backUpWithPasskey(storage, 2)
    assert.equal(storage.files.size, 2)
  })

  it('never uploads the plaintext key', async () => {
    const storage = createInMemoryStorage()
    await backUpWithPasskey(storage, 1)
    for (const [fileName, backupJson] of storage.files) {
      assert.ok(!fileName.includes(PRIVATE_KEY.slice(2)))
      assert.ok(!backupJson.includes(PRIVATE_KEY.slice(2)))
    }
  })

  it('surfaces provider sign-in failures', async () => {
    const storage = createInMemoryStorage()
    storage.failAuthorization = true
    await assert.rejects(backUpWithPasskey(storage, 1), ProviderAuthError)
  })
})

describe('provider sign-in failures that are not ProviderAuthError', () => {
  /** A custom adapter or SDK loader that throws a plain Error from authorize (blocked script, rejected client ID). */
  function createStorageWithBrokenAuthorize() {
    const storage = createInMemoryStorage()
    storage.authorize = async () => {
      throw new Error('Could not load https://accounts.google.com/gsi/client')
    }
    return storage
  }

  it('become ProviderAuthError when uploading, so a backup never fails as BACKUP_FAILED because of sign-in', async () => {
    const prepared = await prepareAccountBackup({ privateKey: PRIVATE_KEY, prfOutput: createFakePrfOutput(1), rpId: RP_ID })
    await assert.rejects(uploadPreparedBackup(createStorageWithBrokenAuthorize(), prepared), ProviderAuthError)
  })

  it('become ProviderAuthError when restoring', async () => {
    await assert.rejects(
      restoreAccountFromProvider({ provider: createStorageWithBrokenAuthorize(), prfOutput: createFakePrfOutput(1), rpId: RP_ID }),
      ProviderAuthError,
    )
  })

  it('do not hide a write failure after a successful sign-in', async () => {
    const storage = createInMemoryStorage()
    storage.writeBackup = async () => {
      throw new Error('quota exceeded')
    }
    const prepared = await prepareAccountBackup({ privateKey: PRIVATE_KEY, prfOutput: createFakePrfOutput(1), rpId: RP_ID })
    await assert.rejects(uploadPreparedBackup(storage, prepared), (error: Error) => !(error instanceof ProviderAuthError))
  })
})

describe('restoring', () => {
  it('restores the account with the same passkey and reports progress once the file is found', async () => {
    const storage = createInMemoryStorage()
    await backUpWithPasskey(storage, 1)
    let backupFoundCalls = 0
    const restored = await restoreAccountFromProvider({
      provider: storage,
      prfOutput: createFakePrfOutput(1),
      rpId: RP_ID,
      onBackupFound: () => {
        backupFoundCalls += 1
      },
    })
    assert.deepEqual(restored, { privateKey: PRIVATE_KEY, address: addressOfPrivateKey(PRIVATE_KEY) })
    assert.equal(backupFoundCalls, 1)
  })

  it('reports BACKUP_NOT_FOUND when there is no file for this passkey', async () => {
    const storage = createInMemoryStorage()
    await backUpWithPasskey(storage, 1)
    await assert.rejects(
      restoreAccountFromProvider({ provider: storage, prfOutput: createFakePrfOutput(2), rpId: RP_ID }),
      (error: PasskeyFlowError) => error.code === 'BACKUP_NOT_FOUND',
    )
  })

  it('reports BACKUP_NOT_FOUND when the listed file disappears before it is read', async () => {
    const storage = createInMemoryStorage()
    await backUpWithPasskey(storage, 1)
    storage.readBackup = async () => null
    await assert.rejects(
      restoreAccountFromProvider({ provider: storage, prfOutput: createFakePrfOutput(1), rpId: RP_ID }),
      (error: PasskeyFlowError) => error.code === 'BACKUP_NOT_FOUND',
    )
  })

  it('reports AMBIGUOUS_BACKUP when several files share one passkey tag', async () => {
    const storage = createInMemoryStorage()
    const backup = await backUpWithPasskey(storage, 1)
    const prfTag = await deriveBackupFileTag(createFakePrfOutput(1), RP_ID)
    storage.files.set(buildBackupFileName(prfTag, addressOfPrivateKey(`0x${'55'.repeat(32)}`)), backup.backupJson)
    await assert.rejects(
      restoreAccountFromProvider({ provider: storage, prfOutput: createFakePrfOutput(1), rpId: RP_ID }),
      (error: PasskeyFlowError) => error.code === 'AMBIGUOUS_BACKUP',
    )
  })

  it('ignores files of other passkeys and foreign names', async () => {
    const storage = createInMemoryStorage()
    await backUpWithPasskey(storage, 2)
    storage.files.set('gwpk-bogus.json', '{}')
    await assert.rejects(
      restoreAccountFromProvider({ provider: storage, prfOutput: createFakePrfOutput(1), rpId: RP_ID }),
      (error: PasskeyFlowError) => error.code === 'BACKUP_NOT_FOUND',
    )
  })

  it('fails to decrypt a file that was renamed to another passkey tag', async () => {
    const storage = createInMemoryStorage()
    const backup = await backUpWithPasskey(storage, 2)
    const prfTagOfPasskeyOne = await deriveBackupFileTag(createFakePrfOutput(1), RP_ID)
    storage.files.clear()
    storage.files.set(buildBackupFileName(prfTagOfPasskeyOne, addressOfPrivateKey(PRIVATE_KEY)), backup.backupJson)
    await assert.rejects(
      restoreAccountFromProvider({ provider: storage, prfOutput: createFakePrfOutput(1), rpId: RP_ID }),
      BackupDecryptError,
    )
  })

  it('fails when the address in the file name differs from the decrypted account', async () => {
    const storage = createInMemoryStorage()
    const backup = await backUpWithPasskey(storage, 1)
    const prfTag = await deriveBackupFileTag(createFakePrfOutput(1), RP_ID)
    storage.files.clear()
    storage.files.set(buildBackupFileName(prfTag, addressOfPrivateKey(`0x${'66'.repeat(32)}`)), backup.backupJson)
    await assert.rejects(
      restoreAccountFromProvider({ provider: storage, prfOutput: createFakePrfOutput(1), rpId: RP_ID }),
      BackupDecryptError,
    )
  })

  it('fails with a format error for an unknown backup version', async () => {
    const storage = createInMemoryStorage()
    const backup = await backUpWithPasskey(storage, 1)
    storage.files.set(backup.fileName, JSON.stringify({ ...JSON.parse(backup.backupJson), version: 2 }))
    await assert.rejects(
      restoreAccountFromProvider({ provider: storage, prfOutput: createFakePrfOutput(1), rpId: RP_ID }),
      BackupFormatError,
    )
  })

  it('surfaces provider sign-in failures', async () => {
    const storage = createInMemoryStorage()
    storage.failAuthorization = true
    await assert.rejects(
      restoreAccountFromProvider({ provider: storage, prfOutput: createFakePrfOutput(1), rpId: RP_ID }),
      ProviderAuthError,
    )
  })
})
