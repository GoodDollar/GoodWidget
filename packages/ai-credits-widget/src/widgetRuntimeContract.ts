import type { Address } from 'viem'
import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/ui'

export type AiCreditsWidgetEnvironment = 'production' | 'staging' | 'development'

export type AiCreditsWidgetStatus =
  | 'disconnected'
  | 'purchase_setup'
  | 'quote_ready'
  | 'payment_pending'
  | 'payment_confirmed'
  | 'insufficient_g_balance'
  | 'payment_failed'
  | 'backend_unavailable'
  | 'unsupported_chain'

export type AiCreditsWidgetTab = 'buy' | 'manage'

export type AiCreditsWidgetPrimaryAction =
  | 'connect'
  | 'switch_chain'
  | 'generate_key'
  | 'sign_consent'
  | 'pay'
  | 'retry'
  | 'refresh'
  | 'none'

export interface AiCreditsQuote {
  depositAmountG: string
  streamAmountG: string
  depositAmountUsd: string
  streamAmountUsd: string
  bonusPercent: number
  totalCredits: string
}

export interface AiCreditsUsageEntry {
  sessionId: string
  timestamp: string
  creditsUsed: number
  model: string
  kind?: 'funding' | 'usage'
  fundingStatus?: 'pending' | 'funded' | 'failed'
}

export interface AiCreditsWidgetAdapterState {
  status: AiCreditsWidgetStatus
  address: string | null
  chainId: number | null
  gBalance: string | null
  aiCreditsBalance: string | null
  isGoodIdVerified: boolean
  buyerKey: string | null
  buyerKeyPrivate: string | null
  buyerKeyConfirmed: boolean
  operatorConsentSigned: boolean
  operatorAddress: string | null
  apiKey: string | null
  depositAmount: string
  streamAmount: string
  minDepositG: string | null
  minStreamG: string | null
  bonusPercent: number
  quote: AiCreditsQuote | null
  setupSnippet: string | null
  usageLog: AiCreditsUsageEntry[]
  totalGdDepositedG: string | null
  monthlyStreamG: string | null
  monthlyStreamCredits: string | null
  withdrawableUsd: string | null
  channelId: string
  withdrawAmount: string
  error: string | null
  primaryAction: AiCreditsWidgetPrimaryAction
  primaryLabel: string
  activeTab: AiCreditsWidgetTab
}

export interface AiCreditsWidgetAdapterActions {
  connect: () => Promise<void>
  switchChain: () => Promise<void>
  generateBuyerKey: () => Promise<void>
  confirmBuyerKey: () => void
  signOperatorConsent: () => Promise<void>
  setDepositAmount: (amount: string) => void
  setStreamAmount: (amount: string) => void
  setChannelId: (channelId: string) => void
  setWithdrawAmount: (amount: string) => void
  pay: () => Promise<void>
  refresh: () => Promise<void>
  startPurchase: () => void
  setActiveTab: (tab: AiCreditsWidgetTab) => void
  closeChannel: () => Promise<void>
  withdrawCredits: () => Promise<void>
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
  buyerKey: string
  creditsReceived: string
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
  fundingVaultAddress?: Address
  vaultAddress?: Address
  themeOverrides?: GoodWidgetThemeOverrides
  config?: GoodWidgetConfig
  defaultTheme?: 'light' | 'dark'
  onPaySuccess?: (detail: AiCreditsPaySuccessDetail) => void
  onPayError?: (detail: AiCreditsPayErrorDetail) => void
  adapterFactory?: AiCreditsWidgetAdapterFactory
}
