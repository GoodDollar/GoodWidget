import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/core'

/** 0x-prefixed hex string (private key or public address). */
export type HexString = `0x${string}`

/** Backup providers the widget knows how to talk to. */
export type PasskeyProviderId = 'google-drive' | 'icloud'

/**
 * Error codes reported through `onError`. Each maps to one of the D screens.
 * `AMBIGUOUS_BACKUP` reuses the D6 layout with its own copy.
 */
export const PASSKEY_ERROR_CODES = [
  'UNSUPPORTED_BROWSER', // D1
  'PASSKEY_CANCELLED', // D2
  'BACKUP_NOT_FOUND', // D3
  'PROVIDER_AUTH_FAILED', // D4
  'BACKUP_FAILED', // D5
  'DECRYPT_FAILED', // D6
  'AMBIGUOUS_BACKUP', // D6 layout, different copy
] as const
export type PasskeyErrorCode = (typeof PASSKEY_ERROR_CODES)[number]

/** Error payload for `onError`. Never contains key material. */
export interface PasskeyLoginErrorDetail {
  code: PasskeyErrorCode
  message: string
}

/** Payload for `onLogin`. This is the only callback that carries the private key. */
export interface PasskeyLoginResult {
  privateKey: HexString
  address: HexString
  isNewAccount: boolean
}

/** Payload for `onBackupComplete`. Never contains the private key. */
export interface PasskeyBackupResult {
  address: HexString
  provider: PasskeyProviderId
}

/**
 * Backup store (Google Drive, iCloud, or a test double). Adapters move an opaque
 * JSON string and know nothing about keys.
 */
export interface PasskeyBackupStorage {
  id: PasskeyProviderId
  /** Human-readable provider name shown on the provider tiles. */
  label: string
  /** Provider sign-in / consent. Throws `ProviderAuthError` when it fails. */
  authorize(): Promise<void>
  /** Names of backup files starting with `gwpk-<prfTag>-`; empty when there are none. */
  listBackupNames(prfTag: string): Promise<string[]>
  /** Raw backup JSON, or null when the file is gone. */
  readBackup(fileName: string): Promise<string | null>
  /** Creates the file, or replaces the file that already has this name. */
  writeBackup(fileName: string, backupJson: string): Promise<void>
}

/** Screens of the flow. The ids follow the A1-D6 designs. */
export const PASSKEY_SCREEN_IDS = [
  'A1_ENTRY',
  'A2_AUTHENTICATING',
  'A3_NEW_ACCOUNT_WARNING',
  'A4_CREATE_PASSKEY',
  'B1_BACKUP_PROMPT',
  'B2_BACKUP_PROVIDER',
  'B3_BACKUP_PROGRESS',
  'B4_BACKUP_SUCCESS',
  'C1_RESTORE_PROVIDER',
  'C2_RESTORE_PROGRESS',
  'C3_RESTORE_SUCCESS',
  'D1_UNSUPPORTED_BROWSER',
  'D2_PASSKEY_CANCELLED',
  'D3_BACKUP_NOT_FOUND',
  'D4_PROVIDER_AUTH_FAILED',
  'D5_BACKUP_FAILED',
  'D6_DECRYPT_FAILED',
] as const
export type PasskeyScreenId = (typeof PASSKEY_SCREEN_IDS)[number]

export interface PasskeyLoginWidgetProps {
  /**
   * Existing user: key of the account that is already logged in. Enables the backup
   * flow (B). Omitted: login / create flow (A, C). A secret: on the custom element it
   * is a JS property only, never an HTML attribute.
   */
  privateKey?: HexString
  /** Fired when the user presses Continue after a successful login or account creation. */
  onLogin?: (result: PasskeyLoginResult) => void
  onBackupComplete?: (result: PasskeyBackupResult) => void
  /** "Not now" (B1), "Skip for now" (D5, existing users) and "Use another login method" (A1, A3, D1). */
  onSkip?: () => void
  onError?: (error: PasskeyLoginErrorDetail) => void
  /** Backup providers offered to the user, in display order. */
  storage: PasskeyBackupStorage[]
  /** WebAuthn relying party id, normally the host's registrable domain. */
  rpId: string
  /** App name shown in the passkey dialog. */
  appName: string
  themeOverrides?: GoodWidgetThemeOverrides
  config?: GoodWidgetConfig
  defaultTheme?: 'light' | 'dark'
  'data-testid'?: string
}
