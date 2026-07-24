import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/core'

export type ConnectAWalletWidgetEnvironment = 'production' | 'staging' | 'development'

// The 3 chains citizen-sdk's IdentityV4 wallet-link contract is deployed to.
export const CONNECT_A_WALLET_CHAINS = [122, 42220, 50] as const
export type ConnectAWalletChainId = (typeof CONNECT_A_WALLET_CHAINS)[number]

// Overall widget status. Distinct from per-chain link status below — this
// tracks the host-wallet connection and the secondary-address input flow.
export type ConnectAWalletWidgetStatus =
  | 'not_connected' // host wallet not connected
  | 'connecting' // host wallet connect() in flight
  | 'connected_no_input' // host wallet connected, no secondary address entered yet
  | 'checking_address' // secondary address entered, per-chain statuses loading
  | 'ready' // per-chain statuses loaded, rows are interactive
  | 'error' // per-chain status lookup itself failed

// Per-chain wallet-link status, one per CONNECT_A_WALLET_CHAINS entry.
// Distinct from ConnectAWalletWidgetStatus so each row can be connecting/
// disconnecting independently of its siblings. No 'error' member: per Bounty
// Lead sign-off, tx failures surface via Toast, not a stuck row state — a
// failed connect/disconnect reverts the row to its prior status.
export type ConnectAWalletChainLinkStatus =
  | 'checking'
  | 'connected'
  | 'not_connected'
  | 'connecting'
  | 'disconnecting'

export interface ConnectAWalletChainLinkState {
  chainId: ConnectAWalletChainId
  chainName: string
  status: ConnectAWalletChainLinkStatus
}

export interface ConnectAWalletWidgetAdapterState {
  // Host wallet (the account authorizing the link/unlink transactions)
  isWalletConnected: boolean
  walletAddress: string | null
  /** Active chain of the host wallet. May be outside CONNECT_A_WALLET_CHAINS. */
  activeChainId: number | null
  isActiveChainSupported: boolean

  // Overall widget status
  status: ConnectAWalletWidgetStatus
  /** Top-level error, set only when status is 'error'. */
  error: string | null

  // Secondary-address input flow
  secondaryAddressInput: string
  /** Set once the entered address has passed basic format validation. */
  secondaryAddress: `0x${string}` | null

  // Per-chain rows, present once a valid secondary address has been checked.
  chainLinks: ConnectAWalletChainLinkState[]
}

export interface ConnectAWalletWidgetAdapterActions {
  /** Triggers the host GoodWidgetProvider connect() flow. */
  connectWallet: () => Promise<void>
  /** Updates the raw text input as the user types. */
  setSecondaryAddressInput: (value: string) => void
  /** Validates the current input and loads per-chain statuses for it. */
  checkSecondaryAddress: () => Promise<void>
  /** Links the secondary address on one chain. Resolves once the tx is mined. */
  connectChain: (chainId: ConnectAWalletChainId) => Promise<void>
  /** Unlinks the secondary address on one chain. Resolves once the tx is mined. */
  disconnectChain: (chainId: ConnectAWalletChainId) => Promise<void>
}

export interface ConnectAWalletWidgetAdapterResult {
  state: ConnectAWalletWidgetAdapterState
  actions: ConnectAWalletWidgetAdapterActions
}

export interface ConnectAWalletLinkEventDetail {
  address: `0x${string}`
  chainId: ConnectAWalletChainId
  transactionHash?: string
}

export interface ConnectAWalletLinkErrorDetail {
  address: string | null
  chainId: ConnectAWalletChainId | null
  message: string
}

export interface ConnectAWalletWidgetProps {
  provider?: unknown
  environment?: ConnectAWalletWidgetEnvironment
  onLinkSuccess?: (detail: ConnectAWalletLinkEventDetail) => void
  onLinkError?: (detail: ConnectAWalletLinkErrorDetail) => void
  onUnlinkSuccess?: (detail: ConnectAWalletLinkEventDetail) => void
  // ---- Theming (optional, passed through to GoodWidgetProvider) ----
  /** Token and theme overrides applied at the widget boundary. */
  themeOverrides?: GoodWidgetThemeOverrides
  /** Full Tamagui config override; prefer themeOverrides for typical integrators. */
  config?: GoodWidgetConfig
  /** Starting color scheme. Defaults to 'dark' to match the other widgets. */
  defaultTheme?: 'light' | 'dark'
  'data-testid'?: string
}

export type { SupportedChains } from '@goodsdks/citizen-sdk'
