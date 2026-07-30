import type { Address } from 'viem'
import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/ui'
import type { BuyerRecord } from './payerSession'

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
export type { BuyerRecord }

export interface AiCreditsWidgetAdapterState {
  status: AiCreditsWidgetStatus
  address: string | null
  chainId: number | null
  gBalance: string | null
  gdUsdPerToken: number | null
  totalCreditUsd: string | null
  isGoodIdVerified: boolean
  /** Active buyer public address (derived from `buyers` + `activeBuyerAddress`). */
  buyerPubKey: string | null
  /** Active buyer private key – absent for address-only buyers. */
  buyerPrvKey: string | null
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
  /** All buyer identities known for the connected payer in this session. */
  buyers: BuyerRecord[]
  /** Address of the currently selected buyer (matches `buyerPubKey`). */
  activeBuyerAddress: string | null
}

export interface AiCreditsWidgetAdapterActions {
  connect: () => Promise<void>
  switchChain: () => Promise<void>
  /**
   * Creates a new deterministically-derived buyer by signing a wallet message.
   * The index is automatically assigned as the next available slot.
   */
  generateBuyerKey: () => Promise<void>
  /**
   * Creates an additional deterministic buyer (next derivation index).
   * Alias kept separate from `generateBuyerKey` for UI clarity.
   */
  createBuyer: () => Promise<void>
  /**
   * Switches the active buyer to an existing buyer in the session.
   * The buyer must already be present in `state.buyers`.
   */
  selectBuyer: (address: string) => void
  /**
   * Imports a buyer identity from a hex private key string.
   * Validates the key format before accepting.
   */
  importBuyerFromPrivateKey: (privateKey: string) => Promise<void>
  /**
   * Registers a buyer address without a private key (view/consent-pairing mode).
   * Sign-required actions will be disabled for this buyer.
   */
  selectBuyerByAddress: (address: string) => void
  /**
   * Applies a deep-link buyer assignment from URL GET parameters.
   * Validates the provided buyer address and signature before accepting.
   */
  applyDeepLinkBuyer: (address: string, signature: string) => Promise<void>
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
  testId?: string
}

