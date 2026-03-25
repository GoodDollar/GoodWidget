/**
 * Child-side EIP-1193 provider that communicates with the host via postMessage.
 *
 * Usage in an embedded iframe or WebView:
 *   const provider = createBridgeProvider({ target: window.parent })
 *   await provider.connect()
 *   await provider.request({ method: 'eth_requestAccounts' })
 */

import type { EIP1193Provider, RequestArguments, EIP1193EventMap } from '@goodwidget/core'
import {
  GW_BRIDGE_NS,
  GW_BRIDGE_VERSION,
  generateId,
  isBridgeMessage,
  type BridgeResponseMessage,
  type BridgeEventMessage,
  type BridgeInitAckMessage,
} from './protocol'

export interface BridgeProviderOptions {
  /** The window or message port to send messages to (e.g. window.parent) */
  target: Window | MessagePort
  /**
   * Origins allowed to respond to the bridge.
   * If empty or omitted, the child accepts whichever origin responds to the
   * init handshake and locks to it for all subsequent messages.
   */
  allowedOrigins?: string[]
  /** Timeout in ms for RPC requests (default 30000) */
  timeoutMs?: number
}

export class BridgeProvider implements EIP1193Provider {
  private target: Window | MessagePort
  private allowedOrigins: string[]
  /** Set after handshake — the actual origin of the host */
  private lockedOrigin: string | undefined
  private timeoutMs: number
  private sessionId: string | undefined
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  private pendingRequests = new Map<string, {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }>()
  private readyPromise: Promise<void>
  private resolveReady!: () => void

  /** Flag that host-side detection can use to identify this as a bridge provider */
  readonly isGoodWidgetBridge = true

  constructor(options: BridgeProviderOptions) {
    this.target = options.target
    this.allowedOrigins = options.allowedOrigins ?? []
    this.timeoutMs = options.timeoutMs ?? 30_000

    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve
    })

    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleMessage)
    }
  }

  /**
   * Initiate the handshake with the host.
   *
   * Sends `init` with targetOrigin='*' so any parent can respond.
   * Once the host acks, the child locks to that origin for all subsequent
   * messages. If `allowedOrigins` was set, the ack origin is validated.
   */
  async connect(appId?: string): Promise<{ sessionId: string; accounts?: string[]; chainId?: string }> {
    const id = generateId()
    this.postToTarget({
      ns: GW_BRIDGE_NS,
      version: GW_BRIDGE_VERSION,
      type: 'init',
      id,
      appId,
    }, '*')

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('message', handler)
        reject(new Error('Bridge handshake timed out'))
      }, this.timeoutMs)

      const handler = (event: MessageEvent) => {
        const data = event.data
        if (!isBridgeMessage(data) || data.type !== 'init-ack') return

        if (this.allowedOrigins.length > 0 && !this.allowedOrigins.includes(event.origin)) {
          return
        }

        clearTimeout(timeout)
        window.removeEventListener('message', handler)

        this.lockedOrigin = event.origin
        const ack = data as BridgeInitAckMessage
        this.sessionId = ack.sessionId
        this.resolveReady()
        resolve({
          sessionId: ack.sessionId,
          accounts: ack.initialState?.accounts,
          chainId: ack.initialState?.chainId,
        })
      }

      window.addEventListener('message', handler)
    })
  }

  async request(args: RequestArguments): Promise<unknown> {
    await this.readyPromise

    const id = generateId()

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new BridgeRequestError(-32603, `Bridge request timed out: ${args.method}`))
      }, this.timeoutMs)

      this.pendingRequests.set(id, { resolve, reject, timer })

      this.postToHost({
        ns: GW_BRIDGE_NS,
        version: GW_BRIDGE_VERSION,
        type: 'request',
        id,
        sessionId: this.sessionId,
        method: args.method,
        params: args.params,
      })
    })
  }

  on<E extends keyof EIP1193EventMap>(event: E, listener: EIP1193EventMap[E]): void {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    set.add(listener as (...args: unknown[]) => void)
  }

  removeListener<E extends keyof EIP1193EventMap>(event: E, listener: EIP1193EventMap[E]): void {
    this.listeners.get(event)?.delete(listener as (...args: unknown[]) => void)
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.handleMessage)
    }
    for (const { timer, reject } of this.pendingRequests.values()) {
      clearTimeout(timer)
      reject(new Error('Bridge destroyed'))
    }
    this.pendingRequests.clear()
    this.listeners.clear()
  }

  // ── internal ──────────────────────────────────────────────────

  private handleMessage = (event: MessageEvent): void => {
    if (!this.isFromLockedOrigin(event.origin)) return
    const data = event.data
    if (!isBridgeMessage(data)) return

    if (data.type === 'response') {
      this.handleResponse(data as BridgeResponseMessage)
    } else if (data.type === 'event') {
      this.handleEvent(data as BridgeEventMessage)
    }
  }

  private handleResponse(msg: BridgeResponseMessage): void {
    const pending = this.pendingRequests.get(msg.requestId)
    if (!pending) return
    this.pendingRequests.delete(msg.requestId)
    clearTimeout(pending.timer)

    if (msg.error) {
      pending.reject(new BridgeRequestError(msg.error.code, msg.error.message, msg.error.data))
    } else {
      pending.resolve(msg.result)
    }
  }

  private handleEvent(msg: BridgeEventMessage): void {
    const eventListeners = this.listeners.get(msg.event)
    if (!eventListeners) return
    for (const listener of eventListeners) {
      try {
        listener(msg.data)
      } catch {
        // listener errors should not break the bridge
      }
    }
  }

  /** Send a message to a specific targetOrigin (used during init) */
  private postToTarget(message: Record<string, unknown>, targetOrigin: string): void {
    if (this.target instanceof MessagePort) {
      this.target.postMessage(message)
    } else {
      this.target.postMessage(message, targetOrigin)
    }
  }

  /** Send a message to the locked host origin (used after handshake) */
  private postToHost(message: Record<string, unknown>): void {
    this.postToTarget(message, this.lockedOrigin ?? '*')
  }

  /** After handshake, only accept messages from the locked origin */
  private isFromLockedOrigin(origin: string): boolean {
    if (!this.lockedOrigin) return true
    return origin === this.lockedOrigin
  }
}

export class BridgeRequestError extends Error {
  code: number
  data?: unknown

  constructor(code: number, message: string, data?: unknown) {
    super(message)
    this.name = 'BridgeRequestError'
    this.code = code
    this.data = data
  }
}

export function createBridgeProvider(options: BridgeProviderOptions): BridgeProvider {
  return new BridgeProvider(options)
}
