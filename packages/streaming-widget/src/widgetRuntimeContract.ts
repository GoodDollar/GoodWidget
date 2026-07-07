import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/ui'
import type { Address } from 'viem'

// ---------------------------------------------------------------------------
// Environment type matching the streaming SDK
// ---------------------------------------------------------------------------
export type StreamingWidgetEnvironment = 'production' | 'staging' | 'development'

// ---------------------------------------------------------------------------
// Supported chain IDs for the streaming widget
// ---------------------------------------------------------------------------
export const STREAMING_CHAINS = {
  CELO: 42220,
  BASE: 8453,
} as const

export type StreamingChainId = (typeof STREAMING_CHAINS)[keyof typeof STREAMING_CHAINS]

// ---------------------------------------------------------------------------
// Active stream direction filter
// ---------------------------------------------------------------------------
export type StreamDirection = 'all' | 'incoming' | 'outgoing'

// ---------------------------------------------------------------------------
// Time unit for flow rate display/input
// ---------------------------------------------------------------------------
export type StreamTimeUnit = 'day' | 'month' | 'year'

// ---------------------------------------------------------------------------
// Widget tab IDs
// ---------------------------------------------------------------------------
export type StreamingWidgetTab = 'streams' | 'history' | 'pools' | 'balances'

// ---------------------------------------------------------------------------
// Operation lifecycle status for write actions
// ---------------------------------------------------------------------------
export type WriteStatus = 'idle' | 'pending' | 'success' | 'error'

// ---------------------------------------------------------------------------
// Stream list item displayed in the Streams tab
// ---------------------------------------------------------------------------
export interface StreamListItem {
  id: string
  sender: Address
  receiver: Address
  token: Address
  /** Flow rate in wei per second */
  flowRate: bigint
  /** Accumulated streamed amount in wei */
  streamedSoFar: bigint
  /** Unix timestamp (seconds) when the stream was created */
  createdAtTimestamp: number
  /** Unix timestamp (seconds) of last on-chain update */
  updatedAtTimestamp: number
  direction: 'incoming' | 'outgoing'
}

// ---------------------------------------------------------------------------
// GDA pool membership displayed in the Pools tab
// ---------------------------------------------------------------------------
export interface PoolMembershipItem {
  poolId: Address
  poolToken: Address
  totalUnits: bigint
  /** Claimable incoming distribution amount in wei, when exposed by the data source */
  claimableAmount: bigint
  /** True when the claimable amount read fails and should be retried */
  claimableAmountError: boolean
  totalAmountClaimed: bigint
  /** Whether this account has actively connected to the pool distribution */
  isConnected: boolean
}

// ---------------------------------------------------------------------------
// SUP reserve locker displayed on Base
// ---------------------------------------------------------------------------
export interface SupReserveLockerItem {
  address: Address
  stakedBalance: bigint
  unstakedBalance: bigint
  totalBalance: bigint
}

// ---------------------------------------------------------------------------
// Form state for create/update stream
// ---------------------------------------------------------------------------
export interface SetStreamFormState {
  receiver: string
  /** User-visible amount string (e.g. "100") */
  amount: string
  timeUnit: StreamTimeUnit
  /** Computed bigint flow rate, null when inputs are invalid */
  flowRate: bigint | null
  /** Validation error message, null when valid */
  validationError: string | null
}

// ---------------------------------------------------------------------------
// Adapter state exposed to the widget UI
// ---------------------------------------------------------------------------
export interface StreamingWidgetAdapterState {
  /** Wallet/connection readiness */
  isConnected: boolean
  address: Address | null
  chainId: number | null
  /** True when the connected chain is not supported by the streaming SDK */
  isWrongChain: boolean

  /** Active + historical streams for the connected address */
  streams: StreamListItem[]
  streamsLoading: boolean
  streamsError: string | null
  streamHistory: StreamListItem[]
  streamHistoryLoading: boolean
  streamHistoryError: string | null

  /** GDA pool memberships for the connected address */
  pools: PoolMembershipItem[]
  poolsLoading: boolean
  poolsError: string | null

  /** Super Token balance (formatted to 18 decimals) */
  superTokenBalance: string | null
  balanceLoading: boolean
  balanceError: string | null

  /** Read-only SUP balance on Base, independent from the connected wallet chain */
  supTokenBalance: string | null
  supBalanceLoading: boolean
  supBalanceError: string | null

  /** Read-only SUP reserve data from Base, independent from the active wallet chain */
  supReserveBalance: string | null
  supReserveLockers: SupReserveLockerItem[]
  supReserveLoading: boolean
  supReserveError: string | null

  /** Set-stream form (create / update) */
  setStreamForm: SetStreamFormState
  setStreamStatus: WriteStatus
  setStreamError: string | null
  setStreamTxHash: string | null

  /** Pool connect/disconnect write status keyed by pool address */
  poolConnectStatus: Record<string, WriteStatus>
  poolConnectError: Record<string, string | null>
  /** Pool claim write status keyed by pool address */
  poolClaimStatus: Record<string, WriteStatus>
  poolClaimError: Record<string, string | null>
}

// ---------------------------------------------------------------------------
// Actions exposed to the widget UI
// ---------------------------------------------------------------------------
export interface StreamingWidgetAdapterActions {
  connect: () => Promise<void>
  switchChain: (chainId: number) => Promise<void>
  refreshStreams: () => Promise<void>
  refreshStreamHistory: () => Promise<void>
  refreshPools: () => Promise<void>
  refreshBalance: () => Promise<void>

  /** Update one or more fields of the set-stream form */
  updateSetStreamForm: (partial: Partial<SetStreamFormState>) => void
  /** Submit the set-stream form — creates or updates a stream */
  submitSetStream: () => Promise<void>
  /** Reset the set-stream form and its write status */
  resetSetStream: () => void

  /** Connect wallet to a GDA pool to begin receiving distributions */
  connectToPool: (poolAddress: Address) => Promise<void>
  /** Disconnect wallet from a GDA pool */
  disconnectFromPool: (poolAddress: Address) => Promise<void>
  /** Claim all currently claimable distributions from a GDA pool */
  claimFromPool: (poolAddress: Address) => Promise<void>
}

export interface StreamingWidgetAdapterResult {
  state: StreamingWidgetAdapterState
  actions: StreamingWidgetAdapterActions
}

// ---------------------------------------------------------------------------
// Public component props
// ---------------------------------------------------------------------------
export interface StreamingWidgetProps {
  provider?: unknown
  environment?: StreamingWidgetEnvironment
  themeOverrides?: GoodWidgetThemeOverrides
  config?: GoodWidgetConfig
  defaultTheme?: 'light' | 'dark'
  /** Subgraph API key — required for SUP reserve queries on Base */
  apiKey?: string
}
