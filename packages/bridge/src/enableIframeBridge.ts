/**
 * Opt-in helper for third-party widget apps running in an iframe.
 *
 * Call this in the widget's entrypoint to enable communication with the host:
 *
 *   import { enableIframeBridge } from '@goodwidget/bridge/child'
 *
 *   const { provider } = await enableIframeBridge({ appId: 'my-widget' })
 *
 *   // `provider` is now a full EIP-1193 provider bridged to the host wallet.
 *   // It is also available as window.ethereum and via EIP-6963.
 */

import { BridgeProvider, type BridgeProviderOptions } from './childProvider'
import { injectBridgeProvider, type InjectOptions, type EIP6963ProviderInfo } from './inject'

export interface EnableIframeBridgeOptions {
  /**
   * Origins of parent windows that are allowed to provide the wallet.
   * If omitted, the child accepts whichever origin responds and locks to it.
   */
  allowedParents?: string[]
  /** Identifier for this widget (included in handshake) */
  appId?: string
  /** Timeout for handshake and requests in ms (default 30000) */
  timeoutMs?: number
  /** Injection options — defaults to injecting window.ethereum + EIP-6963 */
  inject?: InjectOptions
  /** Custom EIP-6963 provider metadata */
  providerInfo?: Partial<EIP6963ProviderInfo>
}

export interface IframeBridgeResult {
  provider: BridgeProvider
  sessionId: string
  accounts?: string[]
  chainId?: string
}

/**
 * Bootstrap the iframe bridge: create a BridgeProvider, perform the handshake,
 * inject it into the window, and return it for direct use.
 *
 * If not running in an iframe, resolves to null.
 */
export async function enableIframeBridge(
  options: EnableIframeBridgeOptions = {},
): Promise<IframeBridgeResult | null> {
  if (typeof window === 'undefined') return null
  if (window.parent === window) return null

  const providerOptions: BridgeProviderOptions = {
    target: window.parent,
    allowedOrigins: options.allowedParents,
    timeoutMs: options.timeoutMs,
  }

  const provider = new BridgeProvider(providerOptions)
  const { sessionId, accounts, chainId } = await provider.connect(options.appId)

  injectBridgeProvider(provider, {
    injectEthereum: true,
    injectGoodWidgetAlias: true,
    eip6963: 'announce',
    providerInfo: options.providerInfo,
    ...options.inject,
  })

  return { provider, sessionId, accounts, chainId }
}
