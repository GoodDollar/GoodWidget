import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/ui'

export type CitizenClaimWidgetEnvironment = 'production' | 'staging' | 'development'

export type CitizenClaimWidgetStatus =
  | 'loading'
  | 'connecting'
  | 'not_connected'
  | 'not_whitelisted'
  | 'eligible'
  | 'already_claimed'
  | 'claiming'
  | 'success'
  | 'error'

export type CitizenClaimWidgetPrimaryAction =
  | 'connect'
  | 'verify'
  | 'claim'
  | 'refresh'
  | 'switch_chain'
  | 'none'

export interface CitizenClaimWidgetSuccessDetail {
  address: string
  chainId: number
  transactionHash?: string
}

export interface CitizenClaimWidgetErrorDetail {
  address: string | null
  chainId: number | null
  message: string
}

export interface CitizenClaimWidgetAdapterState {
  status: CitizenClaimWidgetStatus
  address: string | null
  chainId: number | null
  /** Claimable amount formatted for display (e.g. "193.84"). Null when not applicable. */
  amount: string | null
  token: 'G$'
  primaryAction: CitizenClaimWidgetPrimaryAction
  primaryLabel: string
  error: string | null
  /** When already_claimed, the date when the next claim becomes available. */
  nextClaimTime?: Date | null
  /**
   * Per-chain claimables for the connected wallet.
   * Mirrors GoodWalletV2's "ready to claim per chain" behavior for UBI.
   */
  claimablesByChain: Array<{
    chainId: number
    amount: string
  }>
  dailyStats: {
    dailyNumberOfClaimers: number
    dailyClaimedAmount: number
  }
}

export interface CitizenClaimWidgetAdapterActions {
  connect: () => Promise<void>
  refresh: () => Promise<void>
  startVerification: () => Promise<void>
  claim: () => Promise<unknown>
  claimOnChain: (chainId: number) => Promise<unknown>
  switchChain?: (chainId: number) => Promise<void>
}

export interface CitizenClaimWidgetAdapterResult {
  state: CitizenClaimWidgetAdapterState
  actions: CitizenClaimWidgetAdapterActions
}

export interface CitizenClaimWidgetClientFactoryInput {
  provider: unknown
  address: string
  chainId: number
}

export interface CitizenClaimWidgetClientBundle {
  readClient: unknown
  walletClient: unknown
}

export type CitizenClaimWidgetClientFactory = (
  input: CitizenClaimWidgetClientFactoryInput,
) => CitizenClaimWidgetClientBundle | Promise<CitizenClaimWidgetClientBundle>

export interface CitizenClaimWidgetProps {
  provider?: unknown
  environment?: CitizenClaimWidgetEnvironment
  chainId?: number
  clientFactory?: CitizenClaimWidgetClientFactory
  onClaimSuccess?: (detail: CitizenClaimWidgetSuccessDetail) => void
  onClaimError?: (detail: CitizenClaimWidgetErrorDetail) => void
  // ---- Theming (optional, passed through to GoodWidgetProvider) ----
  /** Token and theme overrides applied at the widget boundary. */
  themeOverrides?: GoodWidgetThemeOverrides
  /** Full Tamagui config override; prefer themeOverrides for typical integrators. */
  config?: GoodWidgetConfig
  /** Starting color scheme. Defaults to 'light'. */
  defaultTheme?: 'light' | 'dark'
}
