import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/ui'

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

export type AiCreditsWidgetEnvironment = 'production' | 'staging' | 'development'

// ---------------------------------------------------------------------------
// Status union — all 13 widget states
// ---------------------------------------------------------------------------

export type AiCreditsWidgetStatus =
  /** No wallet connected; show connect CTA */
  | 'disconnected'
  /** Wallet connected; G$ balance = 0; show balance + warn */
  | 'connected_empty'
  /** G$ balance > 0; user has set deposit/stream amounts >= min; show cost breakdown + bonus badge */
  | 'quote_ready'
  /** Celo buy tx submitted; spinner active */
  | 'payment_pending'
  /** Celo tx mined; backend settling USDC on Base */
  | 'payment_confirmed'
  /** Credits landed on Base; show balance card + setup snippet */
  | 'has_credits'
  /** Credits = 0 after prior purchase; upsell */
  | 'usage_empty'
  /** Credits > 0, usage log visible */
  | 'usage_active'
  /** G$ balance < minimum; show top-up guidance */
  | 'insufficient_g_balance'
  /** API rejected; credits exhausted */
  | 'insufficient_ai_credits'
  /** Celo tx reverted or backend error */
  | 'payment_failed'
  /** Mock/real backend unreachable */
  | 'backend_unavailable'
  /** Wallet on wrong chain; show switch CTA */
  | 'unsupported_chain'

// ---------------------------------------------------------------------------
// Primary action union
// ---------------------------------------------------------------------------

export type AiCreditsWidgetPrimaryAction =
  | 'connect'
  | 'switch_chain'
  | 'generate_key'
  | 'sign_consent'
  | 'pay'
  | 'retry'
  | 'refresh'
  | 'none'

// ---------------------------------------------------------------------------
// Quote — cost breakdown returned from backend
// ---------------------------------------------------------------------------

export interface AiCreditsQuote {
  /** G$ amount for one-time deposit */
  depositAmountG: string
  /** G$ amount for monthly stream */
  streamAmountG: string
  /** USD equivalent of the deposit */
  depositAmountUsd: string
  /** USD equivalent of the stream */
  streamAmountUsd: string
  /** Bonus percentage applied (10% without GoodID, 20% with GoodID on stream) */
  bonusPercent: number
  /** Total credits user will receive */
  totalCredits: string
}

// ---------------------------------------------------------------------------
// Usage log entry
// ---------------------------------------------------------------------------

export interface AiCreditsUsageEntry {
  sessionId: string
  timestamp: string
  creditsUsed: number
  model: string
  kind?: 'funding' | 'usage'
}

// ---------------------------------------------------------------------------
// Adapter state — full snapshot of widget at any point
// ---------------------------------------------------------------------------

export interface AiCreditsWidgetAdapterState {
  status: AiCreditsWidgetStatus
  /** Connected payer wallet address */
  address: string | null
  /** Connected chain ID */
  chainId: number | null
  /** G$ balance of the payer wallet (formatted, e.g. "42.50") */
  gBalance: string | null
  /** AI credits balance on Base (formatted) */
  aiCreditsBalance: string | null
  /** Whether the connected wallet has a verified GoodID */
  isGoodIdVerified: boolean
  /** Buyer key public address (hex) — encoded in CeloGdAntSeedVault deposit data */
  buyerKey: string | null
  /**
   * Raw private key (hex, 0x-prefixed) for the generated buyer key.
   * Shown once to the user so they can store it; never transmitted to the backend.
   */
  buyerKeyPrivate: string | null
  /** Whether the buyer key has been confirmed (copied/saved) by the user */
  buyerKeyConfirmed: boolean
  /** Whether the buyer has signed EIP-712 SetOperator consent for AntseedDeposits on Base */
  operatorConsentSigned: boolean
  /**
   * GoodDollar AntSeed API key (`gd_live_...`) for developer tools.
   * Issued separately from operator consent; not set by the consent step.
   */
  apiKey: string | null
  /** Deposit amount entered by user in G$ */
  depositAmount: string
  /** Monthly stream amount entered by user in G$ */
  streamAmount: string
  /** Bonus percentage based on GoodID status and mode */
  bonusPercent: number
  /** Quote from backend for the current amounts */
  quote: AiCreditsQuote | null
  /** Copyable API snippet once credits are purchased */
  setupSnippet: string | null
  /** Usage log entries */
  usageLog: AiCreditsUsageEntry[]
  /** Human-readable error message when applicable */
  error: string | null
  primaryAction: AiCreditsWidgetPrimaryAction
  primaryLabel: string
}

// ---------------------------------------------------------------------------
// Adapter actions — all user-triggered operations
// ---------------------------------------------------------------------------

export interface AiCreditsWidgetAdapterActions {
  /** Open wallet connection modal */
  connect: () => Promise<void>
  /** Request wallet to switch to Celo (chainId 42220) */
  switchChain: () => Promise<void>
  /** Generate a new random buyer key in-browser */
  generateBuyerKey: () => void
  /** Accept a user-provided buyer key */
  pasteBuyerKey: (key: string) => void
  /** Mark buyer key as confirmed after user has copied it */
  confirmBuyerKey: () => void
  /** Sign EIP-712 SetOperator on AntseedDeposits using the buyer private key */
  signOperatorConsent: () => Promise<void>
  /** Update the one-time deposit amount */
  setDepositAmount: (amount: string) => void
  /** Update the monthly stream amount */
  setStreamAmount: (amount: string) => void
  /** Submit the Celo payment transaction */
  pay: () => Promise<void>
  /** Reload credits balance and usage */
  refresh: () => Promise<void>
  /** Retry after a failed payment or backend error */
  retry: () => Promise<void>
}

export interface AiCreditsWidgetAdapterResult {
  state: AiCreditsWidgetAdapterState
  actions: AiCreditsWidgetAdapterActions
}

// ---------------------------------------------------------------------------
// Adapter factory — used by Storybook stories to inject mock state
// ---------------------------------------------------------------------------

export interface AiCreditsWidgetAdapterFactoryInput {
  environment?: AiCreditsWidgetEnvironment
  backendUrl?: string
}

export type AiCreditsWidgetAdapterFactory = (
  input: AiCreditsWidgetAdapterFactoryInput,
) => AiCreditsWidgetAdapterResult

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Widget props
// ---------------------------------------------------------------------------

export interface AiCreditsWidgetProps {
  /** EIP-1193 provider; omit to enable in-widget connect flow */
  provider?: unknown
  /** Deployment environment; defaults to 'production' */
  environment?: AiCreditsWidgetEnvironment
  /** Base URL of the AntSeed backend worker */
  backendUrl?: string
  /** Token and theme overrides applied at the widget boundary */
  themeOverrides?: GoodWidgetThemeOverrides
  /** Full Tamagui config override; prefer themeOverrides for typical integrators */
  config?: GoodWidgetConfig
  /** Starting color scheme; defaults to 'dark' */
  defaultTheme?: 'light' | 'dark'
  /** Called when payment and credit settlement succeed */
  onPaySuccess?: (detail: AiCreditsPaySuccessDetail) => void
  /** Called when payment or settlement fails */
  onPayError?: (detail: AiCreditsPayErrorDetail) => void
  /** Optional adapter factory for Storybook/testing; bypasses the real adapter */
  adapterFactory?: AiCreditsWidgetAdapterFactory
}
