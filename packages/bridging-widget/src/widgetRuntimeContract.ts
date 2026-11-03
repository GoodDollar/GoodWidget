import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/ui'
import type {
  BridgeConfig,
  BridgeFeeQuote,
  BridgeProtocol,
  BridgeRequirement,
  BridgeTransaction,
  TransactionStatus,
} from '@goodsdks/bridging-sdk'
import type { Address, Hash } from 'viem'

// ---------------------------------------------------------------------------
// Supported chain IDs for the bridging widget, matching bridging-sdk's
// SUPPORTED_CHAINS. Re-declared locally (rather than re-exported as values
// from the SDK) so widget code can reference them without importing the
// SDK's full chain-metadata objects.
// ---------------------------------------------------------------------------
export const BRIDGING_CHAINS = {
  CELO: 42220,
  ETHEREUM: 1,
  FUSE: 122,
  XDC: 50,
} as const

export type BridgingChainId = (typeof BRIDGING_CHAINS)[keyof typeof BRIDGING_CHAINS]

// ---------------------------------------------------------------------------
// Widget tab IDs
// ---------------------------------------------------------------------------
export type BridgingWidgetTab = 'bridge' | 'history' | 'faq'

// ---------------------------------------------------------------------------
// Adapter state exposed to the widget UI
// ---------------------------------------------------------------------------
export interface BridgingWidgetAdapterState {
  /** Wallet/connection readiness */
  isConnected: boolean
  address: Address | null
  /** Network currently reported by the wallet, which may differ from the selected source. */
  walletChainId: number | null
  /** Source chain selected in the widget; independent of the wallet network. */
  chainId: number | null
  /** True when the connected chain is not one of BRIDGING_CHAINS */
  isWrongChain: boolean

  /** Destination chain selected on the Bridge tab, null until the user picks one */
  targetChainId: number | null
  /** Protocols that can carry the selected source→target pair, derived locally from
   *  the SUPPORTED_CHAINS / Axelar-Celo<>Ethereum-only rule — the SDK exposes no
   *  reusable route matrix (see GoodSDKs#67). Empty when no route exists. */
  availableProtocols: BridgeProtocol[]
  /** Protocol selected for the active route, null until the user picks one */
  selectedProtocol: BridgeProtocol | null
  /** True once a target chain is picked and at least one protocol supports the route */
  isRouteSupported: boolean

  /** Raw text of the amount field, kept as a parseUnits-safe string (never a bigint/number) */
  inputAmount: string
  /** Source balance, route limits, and protocol fee bps for the active route; null until loaded */
  bridgeConfig: BridgeConfig | null
  isBridgeConfigLoading: boolean
  bridgeConfigError: string | null

  /** Debounced getQuote result for the current amount + route */
  quoteStatus: 'idle' | 'loading' | 'ready' | 'error'
  quote: BridgeFeeQuote | null
  needsApproval: boolean
  canBridge: boolean
  /** Unmet requirements for the current amount + route (e.g. below min, over limit) */
  requirements: BridgeRequirement[]
  quoteError: string | null

  /** Review drawer (pre-submit summary) open state */
  isReviewOpen: boolean

  /** doBridge() progress, driven by BridgingSDK's onStatus callback. 'idle' means
   *  the Confirm modal is closed; any other value means it is open. */
  submissionStep: 'idle' | 'approving' | 'bridging' | 'completed' | 'failed'
  /** Which step was in flight when a submission failed, for the Confirm modal's Stepper */
  submissionFailedAtStep: 'approving' | 'bridging' | null
  submissionError: string | null
  submissionTxHash: Hash | null
  submissionSourceChainId: number | null
  submissionTargetChainId: number | null
  submissionProtocol: BridgeProtocol | null
  submissionAmount: bigint | null
  submissionDeliveryStatus: TransactionStatus | null
  submissionStatusError: string | null
  submissionSourceExplorerLink: string | null
  submissionProviderExplorerLink: string | null
  submissionDestinationExplorerLink: string | null

  /** Combined source+destination history for the connected address, newest first */
  historyTransactions: BridgeTransaction[]
  isHistoryLoading: boolean
  historyError: string | null
  /** True when a delivery-status lookup failed and the entry remains pending. */
  isHistoryPartial: boolean
  /** Transaction tapped in the History tab; its detail modal is open while non-null */
  selectedHistoryTransaction: BridgeTransaction | null
  /** Block explorer link for selectedHistoryTransaction's source-chain tx, when available */
  selectedHistoryExplorerLink: string | null
}

// ---------------------------------------------------------------------------
// Actions exposed to the widget UI
// ---------------------------------------------------------------------------
export interface BridgingWidgetAdapterActions {
  connect: () => Promise<void>
  switchChain: (chainId: number) => Promise<void>
  /** Choose a source without changing the wallet network. */
  selectSourceChain: (chainId: number) => void
  /** Select the destination chain on the Bridge tab */
  selectTargetChain: (chainId: number) => void
  /** Select the bridge protocol for the active route */
  selectProtocol: (protocol: BridgeProtocol) => void
  /** Update the amount field from a sanitized (parseUnits-safe) string */
  setInputAmount: (amount: string) => void
  /** Fill the amount field from the loaded source balance */
  setMaxAmount: () => void

  /** Open the pre-submit Review drawer; no-op unless canBridge is true */
  openReview: () => void
  closeReview: () => void
  /** Close the Review drawer and start doBridge() for the current quote */
  confirmBridge: () => void
  /** Fetch a fresh quote and retry after a failed submission */
  retrySubmission: () => void
  /** Close the Confirm modal; only meaningful once submissionStep is 'completed' or 'failed' */
  closeSubmission: () => void

  /** Re-fetch history from chain, e.g. after a bridge completes */
  refreshHistory: () => void
  /** Open the detail modal for a tapped History row (pending entries included) */
  viewHistoryTransaction: (transaction: BridgeTransaction) => void
  closeHistoryTransaction: () => void
}

export interface BridgingWidgetAdapterResult {
  state: BridgingWidgetAdapterState
  actions: BridgingWidgetAdapterActions
}

// ---------------------------------------------------------------------------
// Public component props
// ---------------------------------------------------------------------------
export interface BridgingWidgetProps {
  provider?: unknown
  themeOverrides?: GoodWidgetThemeOverrides
  config?: GoodWidgetConfig
  defaultTheme?: 'light' | 'dark'
}
