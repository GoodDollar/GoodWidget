export type {
  PasskeyBackupStorage,
  PasskeyProviderId,
} from '../widgetRuntimeContract.ts'

/**
 * Thrown by storage adapters when provider sign-in, consent or a request authorization fails.
 * Maps to the D4 screen / `PROVIDER_AUTH_FAILED`.
 */
export class ProviderAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProviderAuthError'
  }
}
