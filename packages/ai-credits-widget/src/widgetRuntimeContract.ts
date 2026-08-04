import type { Address } from 'viem'
import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/ui'
import type { AccountRef } from './backendTypes'
import type { AiCreditsBackendClient } from './backendClient'
import type { AiCreditsChainClient } from './chainClient'

export type AiCreditsWidgetEnvironment = 'production' | 'staging' | 'development'

export type AiCreditsWidgetStatus =
  | 'disconnected'
  | 'connecting'
  | 'purchase_setup'
  | 'quote_ready'
  | 'payment_pending'
  | 'payment_confirmed'
  | 'insufficient_g_balance'
  | 'payment_failed'
  | 'backend_unavailable'
  | 'unsupported_chain'

export type AiCreditsWidgetTab = 'buy' | 'manage' | 'history'

export interface AiCreditsQuote {
  depositAmountG: string
  streamAmountG: string
}

/** Re-export for consumers that don't want to import from payerSession directly. */
export type { BuyerKeyEntry } from './payerSession'

export interface AiCreditsWidgetAdapterState {
  status: AiCreditsWidgetStatus
  address: string | null
  chainId: number | null
  gBalance: string | null
  gdUsdPerToken: number | null
  totalCreditUsd: string | null
  isGoodIdVerified: boolean
  /** Active buyer public address. */
  buyerPubKey: string | null
  /** Active buyer private key from the local per-payer key map. */
  buyerPrvKey: string | null
  /** Active buyer deep-link operator signature, if present. */
  operatorSignature: string | null
  operatorConsented: boolean
  operatorAddress: string | null
  minDepositUsd: string | null
  minStreamUsd: string | null
  totalGdDepositedG: string | null
  monthlyStreamG: string | null
  withdrawableUsd: string | null
  depositBonusPercent: number
  streamBonusPercent: number
  error: string | null
  activeTab: AiCreditsWidgetTab
  buyers: string[]
  /** Address of the currently selected buyer (matches `buyerPubKey`). */
  activeBuyerAddress: string | null
}

export interface AiCreditsWidgetAdapterActions {
  connect: () => Promise<void>
  switchChain: () => Promise<void>
  /**
   * Creates or restores the single deterministic buyer for this payer wallet.
   * If a derived key already exists locally, selects that buyer without re-signing.
   */
  generateBuyerKey: () => Promise<void>
  /**
   * Switches the active buyer. Address should be in `state.buyers`.
   */
  selectBuyer: (address: string) => void
  discoverBuyers: (addresses: string[]) => void
  importBuyerFromPrivateKey: (privateKey: string) => Promise<void>
  /**
   * Applies an NCDI deep-link buyer assignment from URL GET parameters
   * (`buyerAddress` + `operatorSignature`). Selects the buyer immediately,
   * submits the pre-signed operator approval token, and starts the buy flow.
   * Never accepts a buyer private key.
   */
  applyDeepLinkBuyer: (address: string, operatorSignature: string) => Promise<void>
  signOperatorConsent: () => Promise<void>
  syncOperatorConsentFromChain: () => Promise<void>
  buildQuote: (depositG: string, streamG: string) => Promise<AiCreditsQuote>
  pay: (quote: AiCreditsQuote) => Promise<void>
  refresh: () => Promise<void>
  verifyGoodId: () => Promise<boolean>
  startPurchase: () => void
  setActiveTab: (tab: AiCreditsWidgetTab) => void
  closeChannel: (channelId: string) => Promise<void>
  withdrawCredits: (amount: string) => Promise<void>
  retry: () => Promise<void>
}

export interface AiCreditsWidgetAdapterResult {
  state: AiCreditsWidgetAdapterState
  actions: AiCreditsWidgetAdapterActions
}

export interface AiCreditsWidgetAdapterFactoryInput {
  environment?: AiCreditsWidgetEnvironment
  backendUrl?: string
}

export type AiCreditsWidgetAdapterFactory = (
  input: AiCreditsWidgetAdapterFactoryInput,
) => AiCreditsWidgetAdapterResult

export interface AiCreditsWidgetAdapterOptions {
  backendClient?: AiCreditsBackendClient
  chainClient?: AiCreditsChainClient
  skipVaultPaymentValidation?: boolean
  prepareSettlement?: (ref: AccountRef, creditUsd: bigint) => void
}

export interface AiCreditsPaySuccessDetail {
  address: string
  chainId: number
  transactionHash: string
  buyerPubKey: string
  creditUsdMicro: string
}

export interface AiCreditsPayErrorDetail {
  address: string | null
  chainId: number | null
  message: string
}

export interface AiCreditsWidgetProps {
  provider?: unknown
  connectOverride?: () => Promise<void>
  environment?: AiCreditsWidgetEnvironment
  backendUrl?: string
  baseRpcUrl?: string
  celoRpcUrl?: string
  fundingVaultAddress?: Address
  vaultAddress?: Address
  goodIdAddress?: Address
  themeOverrides?: GoodWidgetThemeOverrides
  config?: GoodWidgetConfig
  defaultTheme?: 'light' | 'dark'
  onPaySuccess?: (detail: AiCreditsPaySuccessDetail) => void
  onPayError?: (detail: AiCreditsPayErrorDetail) => void
  adapterFactory?: AiCreditsWidgetAdapterFactory
  adapterOptions?: AiCreditsWidgetAdapterOptions
  testId?: string
}

