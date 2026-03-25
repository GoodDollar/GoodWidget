/**
 * Host-side bridge router.
 *
 * Listens for postMessage requests from an iframe/WebView child,
 * validates the origin, forwards EIP-1193 calls to the real provider,
 * and relays provider events back to the child.
 */

import type { EIP1193Provider, EIP1193EventMap } from '@goodwidget/core'
import {
  GW_BRIDGE_NS,
  GW_BRIDGE_VERSION,
  generateId,
  isBridgeMessage,
  type BridgeInitMessage,
  type BridgeRequestMessage,
  type BridgeProviderEvent,
} from './protocol'

export interface HostRouterOptions {
  /** The EIP-1193 provider to forward requests to */
  provider: EIP1193Provider
  /** Origins that are allowed to communicate (e.g. ['https://widget.example.com']) */
  allowedOrigins: string[]
  /** Callback when a child completes the handshake */
  onChildConnected?: (info: { sessionId: string; origin: string; appId?: string }) => void
  /** Callback when a child disconnects (iframe removed, etc.) */
  onChildDisconnected?: (sessionId: string) => void
}

interface ChildSession {
  sessionId: string
  origin: string
  source: MessageEventSource
  appId?: string
}

export class HostRouter {
  private provider: EIP1193Provider
  private allowedOrigins: Set<string>
  private sessions = new Map<string, ChildSession>()
  private eventForwarders: Array<{ event: keyof EIP1193EventMap; handler: (...args: unknown[]) => void }> = []
  private onChildConnected?: HostRouterOptions['onChildConnected']
  private onChildDisconnected?: HostRouterOptions['onChildDisconnected']

  constructor(options: HostRouterOptions) {
    this.provider = options.provider
    this.allowedOrigins = new Set(options.allowedOrigins)
    this.onChildConnected = options.onChildConnected
    this.onChildDisconnected = options.onChildDisconnected

    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleMessage)
    }

    this.subscribeProviderEvents()
  }

  /** Update the provider (e.g. after wallet reconnect) */
  setProvider(provider: EIP1193Provider): void {
    this.unsubscribeProviderEvents()
    this.provider = provider
    this.subscribeProviderEvents()
  }

  /** Tear down all listeners and sessions */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.handleMessage)
    }
    this.unsubscribeProviderEvents()
    for (const sessionId of this.sessions.keys()) {
      this.onChildDisconnected?.(sessionId)
    }
    this.sessions.clear()
  }

  // ── internal ──────────────────────────────────────────────────

  private handleMessage = (event: MessageEvent): void => {
    if (!this.isAllowedOrigin(event.origin)) return
    const data = event.data
    if (!isBridgeMessage(data)) return
    if (!event.source) return

    if (data.type === 'init') {
      this.handleInit(data as BridgeInitMessage, event.source, event.origin)
    } else if (data.type === 'request') {
      this.handleRequest(data as BridgeRequestMessage, event.source, event.origin)
    }
  }

  private async handleInit(msg: BridgeInitMessage, source: MessageEventSource, origin: string): Promise<void> {
    const sessionId = generateId()

    this.sessions.set(sessionId, {
      sessionId,
      origin,
      source,
      appId: msg.appId,
    })

    let accounts: string[] | undefined
    let chainId: string | undefined
    try {
      accounts = (await this.provider.request({ method: 'eth_accounts' })) as string[]
      chainId = (await this.provider.request({ method: 'eth_chainId' })) as string
    } catch {
      // provider may not be connected yet
    }

    this.postToChild(source, origin, {
      ns: GW_BRIDGE_NS,
      version: GW_BRIDGE_VERSION,
      type: 'init-ack',
      id: generateId(),
      sessionId,
      initialState: { accounts, chainId },
    })

    this.onChildConnected?.({ sessionId, origin, appId: msg.appId })
  }

  private async handleRequest(msg: BridgeRequestMessage, source: MessageEventSource, origin: string): Promise<void> {
    const session = this.findSession(source)
    if (!session) return

    try {
      const result = await this.provider.request({
        method: msg.method,
        params: msg.params,
      })

      this.postToChild(source, origin, {
        ns: GW_BRIDGE_NS,
        version: GW_BRIDGE_VERSION,
        type: 'response',
        id: generateId(),
        sessionId: session.sessionId,
        requestId: msg.id,
        result,
      })
    } catch (err: unknown) {
      const rpcErr = err as { code?: number; message?: string; data?: unknown }
      this.postToChild(source, origin, {
        ns: GW_BRIDGE_NS,
        version: GW_BRIDGE_VERSION,
        type: 'response',
        id: generateId(),
        sessionId: session.sessionId,
        requestId: msg.id,
        error: {
          code: rpcErr.code ?? -32603,
          message: rpcErr.message ?? 'Internal error',
          data: rpcErr.data,
        },
      })
    }
  }

  private subscribeProviderEvents(): void {
    const events: BridgeProviderEvent[] = ['accountsChanged', 'chainChanged', 'connect', 'disconnect', 'message']

    for (const event of events) {
      const handler = (data: unknown) => this.broadcastEvent(event, data)
      this.provider.on(event, handler as never)
      this.eventForwarders.push({ event, handler })
    }
  }

  private unsubscribeProviderEvents(): void {
    for (const { event, handler } of this.eventForwarders) {
      this.provider.removeListener(event, handler as never)
    }
    this.eventForwarders = []
  }

  private broadcastEvent(event: BridgeProviderEvent, data: unknown): void {
    for (const session of this.sessions.values()) {
      this.postToChild(session.source, session.origin, {
        ns: GW_BRIDGE_NS,
        version: GW_BRIDGE_VERSION,
        type: 'event',
        id: generateId(),
        sessionId: session.sessionId,
        event,
        data,
      })
    }
  }

  private findSession(source: MessageEventSource): ChildSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.source === source) return session
    }
    return undefined
  }

  private postToChild(target: MessageEventSource, origin: string, message: Record<string, unknown>): void {
    const w = target as Window
    if (typeof w.postMessage === 'function') {
      w.postMessage(message, origin)
    }
  }

  private isAllowedOrigin(origin: string): boolean {
    return this.allowedOrigins.has(origin) || this.allowedOrigins.has('*')
  }
}

export function createHostRouter(options: HostRouterOptions): HostRouter {
  return new HostRouter(options)
}
