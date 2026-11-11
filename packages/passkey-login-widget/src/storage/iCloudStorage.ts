import { filterBackupNamesByTag, parseBackupFileName } from '../crypto/backupFileName.ts'
import { loadExternalScript } from './loadExternalScript.ts'
import { ProviderAuthError } from './storageAdapter.ts'
import type { PasskeyBackupStorage } from '../widgetRuntimeContract.ts'

const CLOUDKIT_JS_URL = 'https://cdn.apple-cloudkit.com/ck/2/cloudkit.js'
/** CloudKit record type; it and a queryable index on `prfTag` must exist in the container (see QA.md). */
export const CLOUDKIT_RECORD_TYPE = 'PasskeyBackup'
const APPLE_SIGN_IN_BUTTON_ELEMENT_ID = 'apple-sign-in-button'
const BACKUP_FILE_EXTENSION = '.json'

export type ICloudEnvironment = 'development' | 'production'

interface CloudKitRecord {
  recordName: string
  recordType?: string
  recordChangeTag?: string
  fields?: Record<string, { value: unknown }>
}

interface CloudKitServerError {
  serverErrorCode?: string
  recordName?: string
}

interface CloudKitResponse {
  hasErrors?: boolean
  errors?: CloudKitServerError[]
  records?: CloudKitRecord[]
  continuationMarker?: string
}

interface CloudKitDatabase {
  performQuery(
    query: {
      recordType: string
      filterBy: { fieldName: string; comparator: string; fieldValue: { value: string } }[]
    },
    options?: { continuationMarker?: string },
  ): Promise<CloudKitResponse>
  fetchRecords(recordNames: string[]): Promise<CloudKitResponse>
  saveRecords(records: CloudKitRecord | CloudKitRecord[]): Promise<CloudKitResponse>
}

export interface CloudKitContainer {
  setUpAuth(): Promise<unknown | null>
  whenUserSignsIn(): Promise<unknown>
  privateCloudDatabase: CloudKitDatabase
}

export interface CloudKitNamespace {
  configure(config: {
    containers: {
      containerIdentifier: string
      apiTokenAuth: { apiToken: string; persist: boolean }
      environment: ICloudEnvironment
    }[]
  }): void
  getDefaultContainer(): CloudKitContainer
}

export interface ICloudStorageOptions {
  /** CloudKit container identifier, e.g. `iCloud.org.gooddollar.passkey`. */
  containerId: string
  /** CloudKit API token (public by design; restricted to allowed origins in the CloudKit Dashboard). */
  apiToken: string
  environment?: ICloudEnvironment
  /** Test seam: replaces loading CloudKit JS from Apple's CDN. */
  loadCloudKit?: () => Promise<CloudKitNamespace>
}

async function loadCloudKitFromAppleCdn(): Promise<CloudKitNamespace> {
  await loadExternalScript(CLOUDKIT_JS_URL)
  const cloudKit = (window as unknown as { CloudKit?: CloudKitNamespace }).CloudKit
  if (!cloudKit) {
    throw new ProviderAuthError('CloudKit JS is not available')
  }
  return cloudKit
}

/**
 * CloudKit renders its own Apple sign-in button, and sign-in must start from a click on it.
 * Shows that button in a small overlay and resolves once the user has signed in.
 */
async function signInWithAppleButton(container: CloudKitContainer): Promise<void> {
  const overlayElement = document.createElement('div')
  overlayElement.style.cssText =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);z-index:2147483647'
  const buttonElement = document.createElement('div')
  buttonElement.id = APPLE_SIGN_IN_BUTTON_ELEMENT_ID
  overlayElement.appendChild(buttonElement)
  document.body.appendChild(overlayElement)
  try {
    await container.setUpAuth()
    await container.whenUserSignsIn()
  } finally {
    overlayElement.remove()
  }
}

/** Throws `ProviderAuthError` for authentication problems and a plain Error for any other CloudKit failure. */
function assertCloudKitResponseOk(response: CloudKitResponse): void {
  if (!response.hasErrors) {
    return
  }
  const errorCodes = (response.errors ?? []).map((error) => error.serverErrorCode)
  if (errorCodes.some((code) => code === 'AUTHENTICATION_REQUIRED' || code === 'AUTHENTICATION_FAILED')) {
    throw new ProviderAuthError('iCloud sign-in is required')
  }
  throw new Error(`CloudKit request failed: ${errorCodes.join(', ')}`)
}

/**
 * iCloud backup storage on CloudKit JS (private database). The backup of a passkey is
 * one `PasskeyBackup` record whose `recordName` is the backup file name without `.json`.
 */
export function createICloudStorage({
  containerId,
  apiToken,
  environment = 'development',
  loadCloudKit = loadCloudKitFromAppleCdn,
}: ICloudStorageOptions): PasskeyBackupStorage {
  let signedInContainer: CloudKitContainer | null = null

  function requireDatabase(): CloudKitDatabase {
    if (!signedInContainer) {
      throw new ProviderAuthError('Not signed in to iCloud')
    }
    return signedInContainer.privateCloudDatabase
  }

  /** Fetches one record; null when it does not exist. */
  async function fetchRecordOrNull(recordName: string): Promise<CloudKitRecord | null> {
    const response = await requireDatabase().fetchRecords([recordName])
    const notFound = (response.errors ?? []).some((error) => error.serverErrorCode === 'NOT_FOUND')
    if (response.hasErrors && !notFound) {
      assertCloudKitResponseOk(response)
    }
    return response.records?.find((record) => record.recordName === recordName && record.fields) ?? null
  }

  return {
    id: 'icloud',
    label: 'iCloud',

    async authorize() {
      if (signedInContainer) {
        return
      }
      const cloudKit = await loadCloudKit()
      cloudKit.configure({
        containers: [{ containerIdentifier: containerId, apiTokenAuth: { apiToken, persist: true }, environment }],
      })
      const container = cloudKit.getDefaultContainer()
      const userIdentity = await container.setUpAuth()
      if (!userIdentity) {
        await signInWithAppleButton(container)
      }
      signedInContainer = container
    },

    // The `prfTag` field has a queryable index, so the lookup is a server-side query
    async listBackupNames(prfTag) {
      const database = requireDatabase()
      const fileNames: string[] = []
      let continuationMarker: string | undefined
      do {
        const response = await database.performQuery(
          {
            recordType: CLOUDKIT_RECORD_TYPE,
            filterBy: [{ fieldName: 'prfTag', comparator: 'EQUALS', fieldValue: { value: prfTag } }],
          },
          continuationMarker ? { continuationMarker } : undefined,
        )
        assertCloudKitResponseOk(response)
        fileNames.push(...(response.records ?? []).map((record) => `${record.recordName}${BACKUP_FILE_EXTENSION}`))
        continuationMarker = response.continuationMarker
      } while (continuationMarker)
      return filterBackupNamesByTag(fileNames, prfTag)
    },

    async readBackup(fileName) {
      const record = await fetchRecordOrNull(fileName.slice(0, -BACKUP_FILE_EXTENSION.length))
      const payload = record?.fields?.payload?.value
      return typeof payload === 'string' ? payload : null
    },

    // Saving by recordName replaces the backup; an existing record must be saved with its change tag
    async writeBackup(fileName, backupJson) {
      const parsedName = parseBackupFileName(fileName)
      if (!parsedName) {
        throw new Error('Invalid backup file name')
      }
      const recordName = fileName.slice(0, -BACKUP_FILE_EXTENSION.length)
      const existingRecord = await fetchRecordOrNull(recordName)
      const response = await requireDatabase().saveRecords({
        recordType: CLOUDKIT_RECORD_TYPE,
        recordName,
        ...(existingRecord?.recordChangeTag ? { recordChangeTag: existingRecord.recordChangeTag } : {}),
        fields: {
          prfTag: { value: parsedName.prfTag },
          address: { value: parsedName.address },
          payload: { value: backupJson },
        },
      })
      assertCloudKitResponseOk(response)
    },
  }
}
