import type { CreditHistoryQuery, CreditHistoryResponse } from '../backendTypes'

/**
 * Identifier of a user's AI credits account on the GoodDollar backend.
 * PROVISIONAL: the payer wallet address, pending confirmation from the backend/vault side (#318 item 12).
 */
export type AiCreditsAccountId = string

/** The user's API key as the widget may show it after creation: masked, never the full secret. */
export interface AiCreditsApiKeySummary {
  /** Display-safe form of the key, e.g. `sk-…a1b2`. */
  maskedKey: string
  /** ISO-8601 timestamp of when the key was created or last rotated. */
  createdAt: string
}

/** Monthly spend cap enforced by the gateway for the user's key. */
export interface AiCreditsSpendLimit {
  /** Cap in micro-USD. */
  limitUsdMicro: string
  /** ISO-8601 timestamp at which the monthly spend counter resets. */
  resetsAt: string
}

/** Everything the API Key tab shows about the user's gateway access. */
export interface AiCreditsApiAccount {
  accountId: AiCreditsAccountId
  /** Gateway base URL the user pastes into their tools. Always supplied by the backend, never hardcoded in the widget. */
  baseUrl: string
  /** Null when the user has no active key (never bought credits, or revoked it). */
  apiKey: AiCreditsApiKeySummary | null
  spendLimit: AiCreditsSpendLimit | null
  /** Spend in the current calendar month, in micro-USD. */
  usedThisMonthUsdMicro: string
}

/** Result of an operation that can mint a new secret. */
export interface AiCreditsApiKeyIssue {
  account: AiCreditsApiAccount
  /**
   * The full key, returned only when a new secret was minted. Null when a top-up raised
   * the limit of an existing key. The widget keeps it in memory only and never persists it.
   */
  fullKey: string | null
}

/** Settled purchase the backend turns into a key or a spend-limit top-up. */
export interface AiCreditsKeyPurchase {
  accountId: AiCreditsAccountId
  /** Credit bought by this payment, in micro-USD. */
  creditUsdMicro: string
  /** Celo transaction of the payment; lets the backend treat a retry as idempotent. */
  transactionHash: string
}

/**
 * The only surface the widget uses to reach gateway-backed key management.
 * Implemented by a GoodDollar backend; the widget never calls the gateway directly.
 */
export interface AiCreditsApi {
  getAccount: (accountId: AiCreditsAccountId) => Promise<AiCreditsApiAccount>
  /** Creates the user's key after their first purchase, or raises its spend limit afterwards. */
  createOrTopUpKey: (purchase: AiCreditsKeyPurchase) => Promise<AiCreditsApiKeyIssue>
  /** Invalidates the current key and returns a fresh one. */
  rotateKey: (accountId: AiCreditsAccountId) => Promise<AiCreditsApiKeyIssue>
  revokeKey: (accountId: AiCreditsAccountId) => Promise<AiCreditsApiAccount>
  getHistory: (
    accountId: AiCreditsAccountId,
    query?: CreditHistoryQuery,
  ) => Promise<CreditHistoryResponse>
}
