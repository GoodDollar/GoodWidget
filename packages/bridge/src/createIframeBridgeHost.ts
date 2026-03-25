/**
 * Convenience factory for setting up the host side of an iframe bridge.
 *
 * Usage:
 *   const cleanup = createIframeBridgeHost({
 *     iframe: document.getElementById('widget-frame'),
 *     provider: window.ethereum,
 *     allowedOrigins: ['https://widget.example.com'],
 *   })
 *
 *   // later:
 *   cleanup()
 */

import type { EIP1193Provider } from '@goodwidget/core'
import { HostRouter, type HostRouterOptions } from './hostRouter'

export interface IframeBridgeHostOptions {
  /** The iframe element to bridge with */
  iframe: HTMLIFrameElement
  /** The host's EIP-1193 provider */
  provider: EIP1193Provider
  /** Origins the host will accept messages from */
  allowedOrigins: string[]
  /** Callback when the child completes handshake */
  onChildConnected?: HostRouterOptions['onChildConnected']
  /** Callback when a child session ends */
  onChildDisconnected?: HostRouterOptions['onChildDisconnected']
}

/**
 * Sets up a HostRouter scoped to a specific iframe.
 * Returns a cleanup function.
 */
export function createIframeBridgeHost(options: IframeBridgeHostOptions): () => void {
  const router = new HostRouter({
    provider: options.provider,
    allowedOrigins: options.allowedOrigins,
    onChildConnected: options.onChildConnected,
    onChildDisconnected: options.onChildDisconnected,
  })

  return () => router.destroy()
}
