import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CLOUDKIT_RECORD_TYPE, createICloudStorage, type CloudKitNamespace } from './iCloudStorage.ts'
import { ProviderAuthError } from './storageAdapter.ts'

const PRF_TAG = 'abcdefghijklmnopqrstuv'
const ADDRESS = '0x1111111111111111111111111111111111111111'
const RECORD_NAME = `gwpk-${PRF_TAG}-${ADDRESS}`

interface FakeRecord {
  recordName: string
  recordChangeTag?: string
  fields: Record<string, { value: unknown }>
}

/** Fake CloudKit JS namespace with a private database held in a Map. */
function createFakeCloudKit(options: { signedIn?: boolean; queryPageSize?: number } = {}) {
  const { signedIn = true, queryPageSize = 100 } = options
  const records = new Map<string, FakeRecord>()
  const savedRecords: unknown[] = []
  const queries: unknown[] = []
  let configuredContainer: unknown = null
  const cloudKit: CloudKitNamespace = {
    configure(config) {
      configuredContainer = config.containers[0]
    },
    getDefaultContainer: () => ({
      setUpAuth: async () => (signedIn ? { userRecordName: 'user' } : null),
      whenUserSignsIn: async () => ({ userRecordName: 'user' }),
      privateCloudDatabase: {
        async performQuery(query, queryOptions) {
          queries.push(query)
          const wantedTag = query.filterBy[0].fieldValue.value
          const matching = [...records.values()].filter((record) => record.fields.prfTag.value === wantedTag)
          const offset = Number(queryOptions?.continuationMarker ?? 0)
          const page = matching.slice(offset, offset + queryPageSize)
          const hasMore = offset + queryPageSize < matching.length
          return { records: page, continuationMarker: hasMore ? String(offset + queryPageSize) : undefined }
        },
        async fetchRecords(recordNames) {
          const record = records.get(recordNames[0])
          return record
            ? { records: [record] }
            : { hasErrors: true, errors: [{ serverErrorCode: 'NOT_FOUND', recordName: recordNames[0] }] }
        },
        async saveRecords(record) {
          savedRecords.push(record)
          const saved = record as FakeRecord
          records.set(saved.recordName, { ...saved, recordChangeTag: 'tag-1' })
          return { records: [saved] }
        },
      },
    }),
  }
  return { cloudKit, records, savedRecords, queries, getConfiguredContainer: () => configuredContainer }
}

describe('iCloud storage', () => {
  it('configures the container with the API token and the chosen environment', async () => {
    const fake = createFakeCloudKit()
    const storage = createICloudStorage({
      containerId: 'iCloud.test',
      apiToken: 'api-token',
      environment: 'production',
      loadCloudKit: async () => fake.cloudKit,
    })
    await storage.authorize()
    assert.deepEqual(fake.getConfiguredContainer(), {
      containerIdentifier: 'iCloud.test',
      apiTokenAuth: { apiToken: 'api-token', persist: true },
      environment: 'production',
    })
  })

  it('requires authorize before any request', async () => {
    const fake = createFakeCloudKit()
    const storage = createICloudStorage({ containerId: 'c', apiToken: 't', loadCloudKit: async () => fake.cloudKit })
    await assert.rejects(storage.listBackupNames(PRF_TAG), ProviderAuthError)
  })

  it('writes a PasskeyBackup record named after the file and reads it back', async () => {
    const fake = createFakeCloudKit()
    const storage = createICloudStorage({ containerId: 'c', apiToken: 't', loadCloudKit: async () => fake.cloudKit })
    await storage.authorize()
    await storage.writeBackup(`${RECORD_NAME}.json`, '{"version":1}')
    assert.deepEqual(fake.savedRecords[0], {
      recordType: CLOUDKIT_RECORD_TYPE,
      recordName: RECORD_NAME,
      fields: { prfTag: { value: PRF_TAG }, address: { value: ADDRESS }, payload: { value: '{"version":1}' } },
    })
    assert.equal(await storage.readBackup(`${RECORD_NAME}.json`), '{"version":1}')
    assert.equal(await storage.readBackup(`gwpk-${PRF_TAG}-0x2222222222222222222222222222222222222222.json`), null)
  })

  it('replaces an existing record using its change tag', async () => {
    const fake = createFakeCloudKit()
    const storage = createICloudStorage({ containerId: 'c', apiToken: 't', loadCloudKit: async () => fake.cloudKit })
    await storage.authorize()
    await storage.writeBackup(`${RECORD_NAME}.json`, 'first')
    await storage.writeBackup(`${RECORD_NAME}.json`, 'second')
    assert.equal(fake.records.size, 1)
    assert.equal((fake.savedRecords[1] as FakeRecord).recordChangeTag, 'tag-1')
    assert.equal(await storage.readBackup(`${RECORD_NAME}.json`), 'second')
  })

  it('lists by prfTag with a server-side query and follows pagination', async () => {
    const fake = createFakeCloudKit({ queryPageSize: 1 })
    const storage = createICloudStorage({ containerId: 'c', apiToken: 't', loadCloudKit: async () => fake.cloudKit })
    await storage.authorize()
    const secondAddress = '0x2222222222222222222222222222222222222222'
    await storage.writeBackup(`${RECORD_NAME}.json`, 'a')
    await storage.writeBackup(`gwpk-${PRF_TAG}-${secondAddress}.json`, 'b')
    await storage.writeBackup(`gwpk-zzzzzzzzzzzzzzzzzzzzzz-${ADDRESS}.json`, 'c')
    assert.deepEqual((await storage.listBackupNames(PRF_TAG)).sort(), [`${RECORD_NAME}.json`, `gwpk-${PRF_TAG}-${secondAddress}.json`])
    assert.equal(fake.queries.length, 2)
  })

  it('signs in through the Apple button when there is no session', async () => {
    const fake = createFakeCloudKit({ signedIn: false })
    const appendedElements: unknown[] = []
    const originalDocument = (globalThis as { document?: unknown }).document
    ;(globalThis as { document?: unknown }).document = {
      createElement: () => ({ style: {}, appendChild: (child: unknown) => appendedElements.push(child), remove: () => appendedElements.splice(0) }),
      body: { appendChild: (element: unknown) => appendedElements.push(element) },
    }
    try {
      const storage = createICloudStorage({ containerId: 'c', apiToken: 't', loadCloudKit: async () => fake.cloudKit })
      await storage.authorize()
      await storage.writeBackup(`${RECORD_NAME}.json`, 'a')
      assert.equal(appendedElements.length, 0, 'the sign-in overlay is removed again')
    } finally {
      ;(globalThis as { document?: unknown }).document = originalDocument
    }
  })

  it('maps authentication errors to ProviderAuthError and other errors to a plain error', async () => {
    const fake = createFakeCloudKit()
    const container = fake.cloudKit.getDefaultContainer()
    const failingDatabase = container.privateCloudDatabase
    const authFailingCloudKit: CloudKitNamespace = {
      configure: () => undefined,
      getDefaultContainer: () => ({
        ...container,
        privateCloudDatabase: { ...failingDatabase, performQuery: async () => ({ hasErrors: true, errors: [{ serverErrorCode: 'AUTHENTICATION_REQUIRED' }] }) },
      }),
    }
    const storage = createICloudStorage({ containerId: 'c', apiToken: 't', loadCloudKit: async () => authFailingCloudKit })
    await storage.authorize()
    await assert.rejects(storage.listBackupNames(PRF_TAG), ProviderAuthError)

    const otherFailingCloudKit: CloudKitNamespace = {
      configure: () => undefined,
      getDefaultContainer: () => ({
        ...container,
        privateCloudDatabase: { ...failingDatabase, performQuery: async () => ({ hasErrors: true, errors: [{ serverErrorCode: 'BAD_REQUEST' }] }) },
      }),
    }
    const otherStorage = createICloudStorage({ containerId: 'c', apiToken: 't', loadCloudKit: async () => otherFailingCloudKit })
    await otherStorage.authorize()
    await assert.rejects(otherStorage.listBackupNames(PRF_TAG), (error: Error) => !(error instanceof ProviderAuthError))
  })

  it('rejects names that are not backup file names', async () => {
    const fake = createFakeCloudKit()
    const storage = createICloudStorage({ containerId: 'c', apiToken: 't', loadCloudKit: async () => fake.cloudKit })
    await storage.authorize()
    await assert.rejects(storage.writeBackup('other.json', 'x'))
  })
})
