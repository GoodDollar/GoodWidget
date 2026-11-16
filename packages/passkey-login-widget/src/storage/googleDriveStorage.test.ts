import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createGoogleDriveStorage, GOOGLE_DRIVE_APPDATA_SCOPE } from './googleDriveStorage.ts'
import { ProviderAuthError } from './storageAdapter.ts'

const OWN_FILE = 'gwpk-abcdefghijklmnopqrstuv-0x1111111111111111111111111111111111111111.json'

interface RecordedRequest {
  url: string
  method: string
  authorization: string | undefined
  body: unknown
}

/** Fake Drive: answers list requests from `pages` and records every request. */
function createFakeDrive(pages: { files: { id: string; name: string }[]; nextPageToken?: string }[], fileContents = 'backup-json') {
  const requests: RecordedRequest[] = []
  const fetchImplementation: typeof fetch = async (input, init) => {
    const url = String(input)
    requests.push({
      url,
      method: init?.method ?? 'GET',
      authorization: (init?.headers as Record<string, string> | undefined)?.Authorization,
      body: init?.body,
    })
    if (url.includes('alt=media')) {
      return new Response(fileContents)
    }
    if (url.startsWith('https://www.googleapis.com/drive/v3/files?')) {
      const pageToken = new URL(url).searchParams.get('pageToken')
      const pageIndex = pageToken ? Number(pageToken) : 0
      return Response.json(pages[pageIndex])
    }
    return Response.json({})
  }
  return { requests, fetchImplementation }
}

function createAuthorizedStorage(fetchImplementation: typeof fetch) {
  return createGoogleDriveStorage({
    clientId: 'test-client',
    requestAccessToken: async () => ({ accessToken: 'token-1', expiresInSeconds: 3600 }),
    fetchImplementation,
  })
}

describe('Google Drive storage', () => {
  it('only requests the drive.appdata scope', () => {
    assert.equal(GOOGLE_DRIVE_APPDATA_SCOPE, 'https://www.googleapis.com/auth/drive.appdata')
  })

  it('lists only this passkey\'s files from the app data folder, across pages', async () => {
    const { requests, fetchImplementation } = createFakeDrive([
      { files: [{ id: '1', name: 'unrelated.txt' }], nextPageToken: '1' },
      { files: [{ id: '2', name: OWN_FILE }, { id: '3', name: 'gwpk-zzzzzzzzzzzzzzzzzzzzzz-0x1111111111111111111111111111111111111111.json' }] },
    ])
    const storage = createAuthorizedStorage(fetchImplementation)
    await storage.authorize()
    assert.deepEqual(await storage.listBackupNames('abcdefghijklmnopqrstuv'), [OWN_FILE])
    assert.equal(requests.length, 2)
    assert.ok(requests.every((request) => new URL(request.url).searchParams.get('spaces') === 'appDataFolder'))
    assert.ok(requests.every((request) => request.authorization === 'Bearer token-1'))
  })

  it('reads a file by name and returns null when it does not exist', async () => {
    const { requests, fetchImplementation } = createFakeDrive([{ files: [{ id: 'file-7', name: OWN_FILE }] }], 'the-json')
    const storage = createAuthorizedStorage(fetchImplementation)
    await storage.authorize()
    assert.equal(await storage.readBackup(OWN_FILE), 'the-json')
    assert.ok(requests.some((request) => request.url.includes('/files/file-7?alt=media')))
    assert.equal(await storage.readBackup('missing.json'), null)
  })

  it('creates the file in appDataFolder when it does not exist', async () => {
    const { requests, fetchImplementation } = createFakeDrive([{ files: [] }])
    const storage = createAuthorizedStorage(fetchImplementation)
    await storage.authorize()
    await storage.writeBackup(OWN_FILE, '{"version":1}')
    const createRequest = requests.find((request) => request.method === 'POST')
    assert.ok(createRequest?.url.includes('uploadType=multipart'))
    assert.ok(String(createRequest?.body).includes(`"parents":["appDataFolder"]`))
    assert.ok(String(createRequest?.body).includes(OWN_FILE))
  })

  it('updates the existing file instead of creating a duplicate', async () => {
    const { requests, fetchImplementation } = createFakeDrive([{ files: [{ id: 'file-7', name: OWN_FILE }] }])
    const storage = createAuthorizedStorage(fetchImplementation)
    await storage.authorize()
    await storage.writeBackup(OWN_FILE, '{"version":1}')
    assert.ok(!requests.some((request) => request.method === 'POST'))
    const updateRequest = requests.find((request) => request.method === 'PATCH')
    assert.ok(updateRequest?.url.includes('/files/file-7?uploadType=media'))
    assert.equal(updateRequest?.body, '{"version":1}')
  })

  it('maps 401 and 403 to ProviderAuthError and other failures to a plain error', async () => {
    for (const status of [401, 403]) {
      const storage = createAuthorizedStorage(async () => new Response('', { status }))
      await storage.authorize()
      await assert.rejects(storage.listBackupNames('abcdefghijklmnopqrstuv'), ProviderAuthError)
    }
    const failingStorage = createAuthorizedStorage(async () => new Response('', { status: 500 }))
    await failingStorage.authorize()
    await assert.rejects(failingStorage.listBackupNames('abcdefghijklmnopqrstuv'), (error: Error) => !(error instanceof ProviderAuthError))
  })

  it('requires authorize before any request', async () => {
    const storage = createAuthorizedStorage(async () => Response.json({ files: [] }))
    await assert.rejects(storage.listBackupNames('abcdefghijklmnopqrstuv'), ProviderAuthError)
  })

  it('surfaces a failed sign-in as ProviderAuthError and reuses a valid token', async () => {
    let tokenRequests = 0
    const storage = createGoogleDriveStorage({
      clientId: 'test-client',
      requestAccessToken: async () => {
        tokenRequests += 1
        return { accessToken: 'token', expiresInSeconds: 3600 }
      },
      fetchImplementation: async () => Response.json({ files: [] }),
    })
    await storage.authorize()
    await storage.authorize()
    assert.equal(tokenRequests, 1)

    const refusedStorage = createGoogleDriveStorage({
      clientId: 'test-client',
      requestAccessToken: async () => {
        throw new ProviderAuthError('closed')
      },
    })
    await assert.rejects(refusedStorage.authorize(), ProviderAuthError)
  })
})
