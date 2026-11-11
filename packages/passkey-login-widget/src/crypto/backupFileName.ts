import type { HexString } from '../widgetRuntimeContract.ts'

/** Every backup file written by this widget starts with this prefix. */
export const BACKUP_FILE_PREFIX = 'gwpk-'

/** `prfTag` is 16 bytes in unpadded base64url, which is always 22 characters. */
const BACKUP_FILE_NAME_PATTERN = /^gwpk-([A-Za-z0-9_-]{22})-(0x[0-9a-f]{40})\.json$/

export interface ParsedBackupFileName {
  prfTag: string
  /** Lowercase public address of the backed-up account. */
  address: HexString
}

/**
 * Builds `gwpk-<prfTag>-<address>.json`. The address is lowercased so re-backing up
 * the same account always produces the same name. Contains no secret material.
 */
export function buildBackupFileName(prfTag: string, address: HexString): string {
  return `${BACKUP_FILE_PREFIX}${prfTag}-${address.toLowerCase()}.json`
}

/** Parses a backup file name; returns null for anything this widget did not write. */
export function parseBackupFileName(fileName: string): ParsedBackupFileName | null {
  const match = BACKUP_FILE_NAME_PATTERN.exec(fileName)
  if (!match) {
    return null
  }
  return { prfTag: match[1], address: match[2] as HexString }
}

/**
 * Keeps only well-formed backup names that belong to the given passkey.
 * Storage adapters use this so prefix filtering is identical for every provider.
 */
export function filterBackupNamesByTag(fileNames: string[], prfTag: string): string[] {
  return fileNames.filter((fileName) => parseBackupFileName(fileName)?.prfTag === prfTag)
}
