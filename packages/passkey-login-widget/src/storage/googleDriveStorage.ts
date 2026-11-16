import { filterBackupNamesByTag } from '../crypto/backupFileName.ts'
import { loadExternalScript } from './loadExternalScript.ts'
import { ProviderAuthError } from './storageAdapter.ts'
import type { PasskeyBackupStorage } from '../widgetRuntimeContract.ts'

/** The only OAuth scope requested: files this OAuth client creates in its private app data folder. */
export const GOOGLE_DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'

const GOOGLE_IDENTITY_SERVICES_URL = 'https://accounts.google.com/gsi/client'
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files'
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files'
const APP_DATA_FOLDER = 'appDataFolder'
const LIST_PAGE_SIZE = 100
/** Refresh slightly before the token really expires so a request never races the expiry. */
const TOKEN_EXPIRY_MARGIN_MS = 60_000

export interface GoogleAccessToken {
  accessToken: string
  expiresInSeconds: number
}

export interface GoogleDriveStorageOptions {
  /** Google OAuth client ID (Web application). Must stay stable: backups live in this client's appDataFolder. */
  clientId: string
  /** Test seam: replaces the Google Identity Services popup. */
  requestAccessToken?: () => Promise<GoogleAccessToken>
  /** Test seam: replaces `fetch`. */
  fetchImplementation?: typeof fetch
}

interface DriveFile {
  id: string
  name: string
}

interface GoogleTokenResponse {
  access_token?: string
  expires_in?: number | string
  error?: string
}

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void
}

interface GoogleIdentityServices {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string
        scope: string
        callback: (response: GoogleTokenResponse) => void
        error_callback: (error: { type?: string }) => void
      }) => GoogleTokenClient
    }
  }
}

/** Opens the Google consent / account popup and resolves with an access token for `drive.appdata`. */
async function requestAccessTokenWithGoogleIdentityServices(clientId: string): Promise<GoogleAccessToken> {
  await loadExternalScript(GOOGLE_IDENTITY_SERVICES_URL)
  const googleIdentityServices = (window as unknown as { google?: GoogleIdentityServices }).google
  if (!googleIdentityServices) {
    throw new ProviderAuthError('Google Identity Services is not available')
  }
  return new Promise<GoogleAccessToken>((resolve, reject) => {
    const tokenClient = googleIdentityServices.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_DRIVE_APPDATA_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new ProviderAuthError('Google sign-in was not completed'))
          return
        }
        resolve({ accessToken: response.access_token, expiresInSeconds: Number(response.expires_in ?? 3600) })
      },
      // Popup closed or blocked
      error_callback: () => reject(new ProviderAuthError('Google sign-in was cancelled')),
    })
    tokenClient.requestAccessToken()
  })
}

/**
 * Google Drive backup storage. Uses only the `drive.appdata` scope and the hidden
 * `appDataFolder`; every request goes straight from the browser to Google.
 */
export function createGoogleDriveStorage({
  clientId,
  requestAccessToken = () => requestAccessTokenWithGoogleIdentityServices(clientId),
  fetchImplementation = (...fetchArguments) => fetch(...fetchArguments),
}: GoogleDriveStorageOptions): PasskeyBackupStorage {
  let cachedAccessToken: string | null = null
  let cachedAccessTokenExpiresAt = 0

  /** Drive request with the bearer token; 401/403 become `ProviderAuthError`, other failures a plain Error. */
  async function callDrive(url: string, init: RequestInit = {}): Promise<Response> {
    if (!cachedAccessToken) {
      throw new ProviderAuthError('Not signed in to Google')
    }
    const response = await fetchImplementation(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${cachedAccessToken}` },
    })
    if (response.status === 401 || response.status === 403) {
      cachedAccessToken = null
      throw new ProviderAuthError('Google rejected the request')
    }
    if (!response.ok) {
      throw new Error(`Google Drive request failed with status ${response.status}`)
    }
    return response
  }

  /** Lists every file in the app folder, following pagination. */
  async function listAllFiles(): Promise<DriveFile[]> {
    const files: DriveFile[] = []
    let pageToken: string | undefined
    do {
      const query = new URLSearchParams({
        spaces: APP_DATA_FOLDER,
        pageSize: String(LIST_PAGE_SIZE),
        fields: 'nextPageToken,files(id,name)',
      })
      if (pageToken) {
        query.set('pageToken', pageToken)
      }
      const page = (await (await callDrive(`${DRIVE_FILES_URL}?${query}`)).json()) as {
        files?: DriveFile[]
        nextPageToken?: string
      }
      files.push(...(page.files ?? []))
      pageToken = page.nextPageToken
    } while (pageToken)
    return files
  }

  return {
    id: 'google-drive',
    label: 'Google Drive',

    async authorize() {
      const tokenStillValid = cachedAccessToken !== null && Date.now() < cachedAccessTokenExpiresAt
      if (tokenStillValid) {
        return
      }
      const token = await requestAccessToken()
      cachedAccessToken = token.accessToken
      cachedAccessTokenExpiresAt = Date.now() + token.expiresInSeconds * 1000 - TOKEN_EXPIRY_MARGIN_MS
    },

    // Drive's `name contains` is token based, so the prefix filter runs client-side
    async listBackupNames(prfTag) {
      const files = await listAllFiles()
      return filterBackupNamesByTag(
        files.map((file) => file.name),
        prfTag,
      )
    },

    async readBackup(fileName) {
      const existingFile = (await listAllFiles()).find((file) => file.name === fileName)
      if (!existingFile) {
        return null
      }
      const response = await callDrive(`${DRIVE_FILES_URL}/${encodeURIComponent(existingFile.id)}?alt=media`)
      return response.text()
    },

    // Drive allows duplicate names, so look the name up first: update when it exists, create otherwise
    async writeBackup(fileName, backupJson) {
      const existingFile = (await listAllFiles()).find((file) => file.name === fileName)
      if (existingFile) {
        await callDrive(`${DRIVE_UPLOAD_URL}/${encodeURIComponent(existingFile.id)}?uploadType=media`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: backupJson,
        })
        return
      }
      const multipartBoundary = `gwpk-${crypto.randomUUID()}`
      const multipartBody = [
        `--${multipartBoundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify({ name: fileName, parents: [APP_DATA_FOLDER] }),
        `--${multipartBoundary}`,
        'Content-Type: application/json',
        '',
        backupJson,
        `--${multipartBoundary}--`,
      ].join('\r\n')
      await callDrive(`${DRIVE_UPLOAD_URL}?uploadType=multipart`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${multipartBoundary}` },
        body: multipartBody,
      })
    },
  }
}
