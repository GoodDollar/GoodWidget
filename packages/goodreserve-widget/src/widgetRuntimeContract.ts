import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/ui'

export type ReserveSwapDirection = 'buy' | 'sell'

export type ReserveSwapWidgetStatus =
  | 'no_provider'
  | 'unsupported_chain'
  | 'sdk_initializing'
  | 'idle'
  | 'amount_editing'
  | 'quote_loading'
  | 'quote_ready'
  | 'quote_error'
  | 'insufficient_balance'
  | 'slippage_selection'
  | 'confirm_dialog'
  | 'swap_pending'
  | 'swap_success'
  | 'swap_error'

export interface ReserveSwapQuoteView {
  outputAmount: string
  price: string
  minimumReceived: string
  /** Raw minReturn (base units, BigInt-as-string) submitted on-chain. Matches `minimumReceived`. */
  minReturnRaw?: string
  priceImpactPercent: string
  exitContributionPercent: string
}

export interface ReserveSwapWidgetAdapterState {
  status: ReserveSwapWidgetStatus
  chainId: number | null
  address: string | null
  hasProvider: boolean
  direction: ReserveSwapDirection
  inputAmount: string
  slippagePercent: number
  tokenInSymbol: string
  tokenOutSymbol: string
  tokenInBalance: string
  tokenOutBalance: string
  quote: ReserveSwapQuoteView | null
  warning: string | null
  error: string | null
  txHash: string | null
  /** Output amount of the most recent successful swap (preserved after quote is cleared). */
  lastSwapOutput: string | null
  /** Epoch ms after which the current quote is considered stale (null when no quote). */
  quoteExpiresAt: number | null
}

export interface ReserveSwapWidgetAdapterActions {
  connect: () => Promise<void>
  switchChain: (chainId: number) => Promise<void>
  setDirection: (direction: ReserveSwapDirection) => void
  setInputAmount: (value: string) => void
  setMaxAmount: () => void
  setSlippagePercent: (value: number) => void
  openSlippage: () => void
  closeSlippage: () => void
  openConfirm: () => void
  closeConfirm: () => void
  executeSwap: () => Promise<void>
  refresh: () => Promise<void>
}

export interface ReserveSwapWidgetAdapterResult {
  state: ReserveSwapWidgetAdapterState
  actions: ReserveSwapWidgetAdapterActions
}

export interface ReserveSwapSuccessDetail {
  address: string | null
  chainId: number | null
  transactionHash: string
}

export interface ReserveSwapErrorDetail {
  address: string | null
  chainId: number | null
  message: string
}

export interface ReserveSwapWidgetProps {
  provider?: unknown
  config?: GoodWidgetConfig
  themeOverrides?: GoodWidgetThemeOverrides
  /**
   * The GoodReserve widget is dark-only (the GoodWalletV2 design system has no
   * light variant for it), so only 'dark' is supported.
   */
  defaultTheme?: 'dark'
  /** Chain proposed by the unsupported-chain CTA. Defaults to Celo (42220). */
  preferredChainId?: number
  onSwapSuccess?: (detail: ReserveSwapSuccessDetail) => void
  onSwapError?: (detail: ReserveSwapErrorDetail) => void
  mockState?: Partial<ReserveSwapWidgetAdapterState>
}
