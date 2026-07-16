import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/ui'

export type BuyGdWidgetStatus =
  | 'idle'
  | 'loading'
  | 'onramper'
  | 'transaction_pending'
  | 'success'
  | 'error'
  | 'no_wallet'

export interface BuyGdWidgetState {
  status: BuyGdWidgetStatus
  chainId: number | null
  address: string | null
  hasProvider: boolean
  fiatAmount: string
  stableMinAmount: string
  currency: string
  error: string | null
  txHash: string | null
}

export interface BuyGdWidgetActions {
  connect: () => Promise<void>
  openOnramper: () => void
  setFiatAmount: (value: string) => void
  setStableMinAmount: (value: string) => void
  setCurrency: (value: string) => void
  startBuy: () => Promise<void>
  retry: () => void
  refresh: () => Promise<void>
}

export interface BuyGdWidgetAdapterResult {
  state: BuyGdWidgetState
  actions: BuyGdWidgetActions
}

export interface BuyGdWidgetAdapterFactoryInput {
  onramperUrl: string
  pollIntervalMs: number
}

export type BuyGdWidgetAdapterFactory = (
  input: BuyGdWidgetAdapterFactoryInput,
) => BuyGdWidgetAdapterResult

export interface BuyGdSuccessDetail {
  address: string | null
  chainId: number | null
  transactionHash: string | null
}

export interface BuyGdErrorDetail {
  address: string | null
  chainId: number | null
  message: string
}

export interface BuyGdWidgetProps {
  provider?: unknown
  config?: GoodWidgetConfig
  themeOverrides?: GoodWidgetThemeOverrides
  defaultTheme?: 'light' | 'dark'
  onramperApiKey?: string
  onramperThemeMode?: 'dark' | 'light'
  onramperOnlyCryptos?: string
  onramperDefaultCrypto?: string
  onramperDefaultFiat?: string
  pollIntervalMs?: number
  adapterFactory?: BuyGdWidgetAdapterFactory
  onBuySuccess?: (detail: BuyGdSuccessDetail) => void
  onBuyError?: (detail: BuyGdErrorDetail) => void
}
