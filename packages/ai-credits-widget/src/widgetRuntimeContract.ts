import type { Address } from 'viem'
import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/ui'

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

export interface AiCreditsWidgetAdapterState {
  status: AiCreditsWidgetStatus
  address: string | null
  chainId: number | null
  gBalance: string | null
  gdUsdPerToken: number | null
  totalCreditUsd: string | null
  isGoodIdVerified: boolean
  buyerPubKey: string | null
  buyerPrvKey: string | null
  operatorConsented: boolean
  operatorAddress: string | null
  minDepositUsd: string | null
  minStreamUsd: string | null
  totalGdDepositedG: string | null
  monthlyStreamG: string | null
  withdrawableUsd: string | null
  error: string | null
  activeTab: AiCreditsWidgetTab
}

export interface AiCreditsWidgetAdapterActions {
  connect: () => Promise<void>
  switchChain: () => Promise<void>
  generateBuyerKey: () => Promise<void>
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
