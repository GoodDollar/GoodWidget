import type { EIP1193Provider } from './eip1193'
import type { ReactNode } from 'react'
import type { GoodWidgetConfig, GoodWidgetThemeOverrides, IconName } from '@goodwidget/ui'

export type HostEnvironment = 'farcaster' | 'minipay' | 'worldapp' | 'injected' | 'custom'

export interface HostCapabilities {
  batchTransactions: boolean
  feeCurrency: boolean
  haptics: boolean
  notifications: boolean
  signin: boolean
}

export interface HostDetectionResult {
  host: HostEnvironment
  provider: EIP1193Provider
  capabilities: HostCapabilities
}

export interface WalletState {
  address: string | null
  chainId: number | null
  isConnected: boolean
  provider: EIP1193Provider | null
  /**
   * Chain ids the passed-down provider can actually execute on right now
   * (e.g. an AppKit connection's approved networks). `null` means no
   * restriction is known, so on-chain execute actions should not be gated
   * by chain availability.
   */
  availableChainIds: number[] | null
}

export interface HostState {
  host: HostEnvironment
  capabilities: HostCapabilities
}

export interface GoodWidgetState extends WalletState {
  host: HostEnvironment
  capabilities: HostCapabilities
}

export interface GoodWidgetProviderProps {
  provider?: EIP1193Provider
  connectOverride?: () => Promise<void>
  disconnectOverride?: () => Promise<void>
  /**
   * Integrator-owned live address (e.g. from a wallet-connection SDK's own
   * reactive account hook). When set, including `null`, this replaces the
   * address normally derived from the raw provider's `accountsChanged`
   * event/`eth_accounts` call, which some connectors (e.g. a WalletConnect
   * session bridged through AppKit) do not reliably emit.
   */
  addressOverride?: string | null
  /**
   * Integrator-owned live chain id, mirroring `addressOverride`. When set,
   * including `null`, this replaces the chain id normally derived from the
   * raw provider's `chainChanged` event/`eth_chainId` call.
   */
  chainIdOverride?: number | null
  /**
   * Integrator-owned chain-switch fallback, invoked when a raw
   * `wallet_switchEthereumChain` request fails or the provider does not
   * support it (e.g. to open a connection SDK's own network modal).
   */
  switchChainOverride?: (chainId: number) => Promise<void>
  /**
   * Integrator-owned set of chain ids the passed-down provider can currently
   * execute on (e.g. AppKit's approved networks). `null`/omitted means no
   * restriction is known. On-chain execute actions must be scoped to this
   * set; balance/entitlement reads are unaffected since those use read-only
   * clients keyed on `address` alone.
   */
  availableChainIdsOverride?: number[] | null
  /**
   * Label for the disconnect action in the wallet chip menu. Defaults to
   * "Disconnect". Integrators whose `disconnectOverride` opens a
   * connection-management modal rather than disconnecting directly (e.g.
   * AppKit's Account view) should override this to something like "Network
   * settings" so the action's label matches what it actually does.
   */
  disconnectLabel?: string
  /**
   * Icon for the disconnect action in the wallet chip menu, mirroring
   * `disconnectLabel`. Defaults to 'log-out'. Integrators overriding
   * `disconnectLabel` to describe a settings/management action (e.g.
   * AppKit's "Network settings") should pair it with a matching icon (e.g.
   * 'settings') instead of leaving the literal log-out glyph.
   */
  disconnectIcon?: IconName
  config?: GoodWidgetConfig
  themeOverrides?: GoodWidgetThemeOverrides
  defaultTheme?: 'light' | 'dark'
  /** Desktop content cap. Defaults to the existing 480px mobile-first layout. */
  contentMaxWidth?: number
  children: ReactNode
}
