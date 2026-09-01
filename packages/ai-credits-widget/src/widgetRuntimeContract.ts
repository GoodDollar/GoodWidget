import type { Address } from 'viem'
import type { GoodWidgetConfig, GoodWidgetThemeOverrides, IconName } from '@goodwidget/ui'
import type { AccountRef } from './backendTypes'
import type { AiCreditsBackendClient } from './backendClient'
import type { AiCreditsChainClient } from './chainClient'

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

export type AiCreditsWidgetTab = 'buy' | 'setup' | 'manage' | 'history'

export interface AiCreditsQuote {
  depositAmountG: string
  streamAmountG: string
}
/** Re-export for consumers that don't want to import from payerSession directly. */
export type { SignerKeyEntry } from './payerSession'

export interface AiCreditsWidgetAdapterState {
  status: AiCreditsWidgetStatus
  address: string | null
  chainId: number | null
  gBalance: string | null
  gdUsdPerToken: number | null
  totalCreditUsd: string | null
  isGoodIdVerified: boolean
  /** Active signer public address. */
  signerPubKey: string | null
  /** Active signer private key from the local per-payer key map. */
  signerPrvKey: string | null
  /** Active signer deep-link operator signature, if present. */
  operatorSignature: string | null
  operatorConsented: boolean
  /** True while submitting / waiting for on-chain operator consent. */
  operatorConsentPending: boolean
  operatorAddress: string | null
  /** Operator currently configured for the active signer, if any. */
  currentOperator: string | null
  minDepositUsd: string | null
  minStreamUsd: string | null
  /** Bonus credit earned so far, in micro-USD. Folded into `totalCreditUsd`. */
  totalBonusUsd: string | null
  totalGdDepositedG: string | null
  monthlyStreamG: string | null
  withdrawableUsd: string | null
  depositBonusPercent: number
  streamBonusPercent: number
  error: string | null
  activeTab: AiCreditsWidgetTab
  signers: string[]
  /** Deterministic signer derived from the payer wallet Sign & Generate path. */
  derivedSignerAddress: string | null
}

export interface AiCreditsWidgetAdapterActions {
  connect: () => Promise<void>
  switchChain: () => Promise<void>
  /**
   * Creates or restores the single deterministic signer for this payer wallet.
   * If a derived key already exists locally, selects that signer without re-signing.
   */
  generateSignerKey: () => Promise<void>
  /**
   * Switches the active signer and reloads that signer's account view.
   * Address should be in `state.signers`.
   */
  selectSigner: (address: string) => Promise<void>
  discoverSigners: (addresses: string[]) => void
  /**
   * Imports a signer key, stores it and selects it as the active signer.
   * Resolves with the imported Signer Address, or `null` when the key could
   * not be imported — callers use that to report the outcome of *this* import
   * rather than the state of whichever signer happened to be active.
   */
  importSignerFromPrivateKey: (privateKey: string) => Promise<string | null>
  /**
   * Applies an NCDI deep-link signer assignment from URL GET parameters
   * (`signerAddress` + `operatorSignature`). Selects the signer immediately,
   * submits the pre-signed operator approval token, and starts the buy flow.
   * Never accepts a signer private key.
   */
  applyDeepLinkSigner: (address: string, operatorSignature: string) => Promise<void>
  signOperatorConsent: () => Promise<void>
  revokeOperatorConsent: () => Promise<void>
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

export interface AiCreditsWidgetAdapterOptions {
  backendClient?: AiCreditsBackendClient
  chainClient?: AiCreditsChainClient
  skipVaultPaymentValidation?: boolean
  prepareSettlement?: (ref: AccountRef, creditUsd: bigint) => void
}

export interface AiCreditsPaySuccessDetail {
  address: string
  chainId: number
  transactionHash: string
  signerPubKey: string
  creditUsdMicro: string
}

export interface AiCreditsPayErrorDetail {
  address: string | null
  chainId: number | null
  message: string
}

export interface AiCreditsWidgetProps {
  provider?: unknown
  connectOverride?: () => Promise<void>
  /**
   * Shows the connected-wallet chip (address, and disconnect when the host supplies
   * `disconnectOverride`) in the widget header.
   *
   * Off by default: wallet hosts own the connection and must not offer a second,
   * widget-local way to end it. Standalone deployments and Storybook opt in.
   */
  showWalletControls?: boolean
  /**
   * Integrator-owned wallet disconnect flow. Without it the chip renders the address
   * only, and its menu explains that the session belongs to the host.
   */
  disconnectOverride?: () => Promise<void>
  /**
   * Label for the chip's menu action. Defaults to "Disconnect", which only fits when
   * `disconnectOverride` really ends the session — integrators who instead open an
   * account modal should relabel it.
   */
  disconnectLabel?: string
  /** Icon for the chip's menu action, mirroring `disconnectLabel`. */
  disconnectIcon?: IconName
  /**
   * Integrator-owned live address (e.g. from a wallet-connection SDK's own
   * reactive account hook). See `GoodWidgetProviderProps.addressOverride`.
   */
  addressOverride?: string | null
  /**
   * Integrator-owned live chain id, mirroring `addressOverride`. See
   * `GoodWidgetProviderProps.chainIdOverride`. Worth supplying for connectors
   * that do not reliably emit `chainChanged` — a WalletConnect session bridged
   * through AppKit, for one — otherwise the widget can keep reporting the wrong
   * network after the user has already switched.
   */
  chainIdOverride?: number | null
  /**
   * Integrator-owned chain-switch fallback, used when the wallet rejects or
   * ignores `wallet_switchEthereumChain`. See
   * `GoodWidgetProviderProps.switchChainOverride`. Without it, wallets that
   * cannot be switched from a page leave the user stuck on the wrong network.
   */
  switchChainOverride?: (chainId: number) => Promise<void>
  /**
   * Chain ids the passed-down provider can currently execute on. See
   * `GoodWidgetProviderProps.availableChainIdsOverride`.
   */
  availableChainIdsOverride?: number[] | null
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
  adapterOptions?: AiCreditsWidgetAdapterOptions
  testId?: string
}
