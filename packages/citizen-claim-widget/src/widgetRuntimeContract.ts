import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/ui'
import type { Account, Chain, PublicClient, Transport, WalletClient } from 'viem'

export type CitizenClaimWidgetEnvironment = 'production' | 'staging' | 'development'

export type CitizenClaimWidgetStatus =
  | 'loading'
  | 'connecting'
  | 'not_connected'
  /** Wallet is connected but its active chain isn't one citizen-sdk supports. */
  | 'unsupported_chain'
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

export type CitizenClaimTab = 'claim' | 'invite-rewards' | 'news-feed'

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
  claimAll: (
    chainIds: number[],
  ) => Promise<CitizenClaimWidgetChainClaimResult[]>
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

export type CitizenClaimWidgetWalletClient = WalletClient<
  Transport,
  Chain | undefined,
  Account | undefined
>

export interface CitizenClaimWidgetClientBundle {
  /** Public client bound to the same chain as `walletClient`. */
  publicClient?: PublicClient
  /** @deprecated Use `publicClient`; retained for compatibility with early integrations. */
  readClient?: PublicClient
  /** Wallet client with the account/signing capability for this chain. */
  walletClient: CitizenClaimWidgetWalletClient
}

export type CitizenClaimWidgetClientFactory = (
  input: CitizenClaimWidgetClientFactoryInput,
) => CitizenClaimWidgetClientBundle | Promise<CitizenClaimWidgetClientBundle>

export type CitizenClaimWidgetClientsByChain = Partial<
  Record<number, CitizenClaimWidgetClientBundle>
>

/**
 * Explicit execution mode for wallet-owned custodial claiming.
 *
 * The widget uses one client pair per chain, creates the custodial SDK instances,
 * and submits eligible claims independently in parallel.
 */
export interface CitizenClaimWidgetCustodialExecution {
  mode: 'custodial'
  clientsByChain: CitizenClaimWidgetClientsByChain
}

export interface CitizenClaimWidgetChainClaimResult {
  chainId: number
  status: 'fulfilled' | 'rejected'
  receipt?: unknown
  error?: unknown
}

export interface CitizenClaimWidgetProps {
  provider?: unknown
  environment?: CitizenClaimWidgetEnvironment
  /**
   * Fallback chain id shown only until the live wallet chain resolves via
   * `provider`/`chainIdOverride`, or while disconnected. Once a live chain is
   * known it always takes precedence over this value.
   */
  chainId?: number
  clientFactory?: CitizenClaimWidgetClientFactory
  claimExecution?: CitizenClaimWidgetCustodialExecution
  onClaimSuccess?: (detail: CitizenClaimWidgetSuccessDetail) => void
  onClaimError?: (detail: CitizenClaimWidgetErrorDetail) => void
  /**
   * Integrator-owned live address (e.g. from a wallet-connection SDK's own
   * reactive account hook). See `GoodWidgetProviderProps.addressOverride`.
   */
  addressOverride?: string | null
  /**
   * Integrator-owned live chain id, mirroring `addressOverride`. See
   * `GoodWidgetProviderProps.chainIdOverride`.
   */
  chainIdOverride?: number | null
  /**
   * Integrator-owned connect fallback (e.g. opening a wallet-connect modal
   * instead of requesting the injected provider directly). See
   * `GoodWidgetProviderProps.connectOverride`.
   */
  connectOverride?: () => Promise<void>
  /**
   * Integrator-owned chain-switch fallback. See
   * `GoodWidgetProviderProps.switchChainOverride`.
   */
  switchChainOverride?: (chainId: number) => Promise<void>
  /**
   * Chain ids the passed-down provider can currently execute on. See
   * `GoodWidgetProviderProps.availableChainIdsOverride`. Claim execution is
   * scoped to this set; balance/entitlement reads are unaffected.
   */
  availableChainIdsOverride?: number[] | null
  // ---- Theming (optional, passed through to GoodWidgetProvider) ----
  /** Token and theme overrides applied at the widget boundary. */
  themeOverrides?: GoodWidgetThemeOverrides
  /** Full Tamagui config override; prefer themeOverrides for typical integrators. */
  config?: GoodWidgetConfig
  /** Starting color scheme. Defaults to 'light'. */
  defaultTheme?: 'light' | 'dark'
  /** Tab shown on first render. Defaults to 'claim' when omitted. */
  initialTab?: CitizenClaimTab
}
