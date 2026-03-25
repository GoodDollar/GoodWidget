/**
 * Lightweight bridge auto-detection for GoodWidgetProvider.
 *
 * Handles two contexts:
 * - **Iframe:** sends a postMessage handshake to window.parent
 * - **WebView:** polls for an injected provider (set by createWebViewBridgeScript)
 *
 * This is a minimal inline implementation that avoids importing @goodwidget/bridge
 * (which depends on core, so that would create a circular dep). The full-featured
 * BridgeProvider in @goodwidget/bridge extends this with richer APIs.
 */

import type { EIP1193Provider, RequestArguments, EIP1193EventMap } from './eip1193'

const GW_BRIDGE_NS = 'gw-bridge'
const GW_BRIDGE_VERSION = '1.0.0'

let counter = 0
function genId(): string {
  return `gw-${Date.now()}-${++counter}`
}

interface BridgeMessage {
  ns: string
  type: string
  id: string
  [key: string]: unknown
}

interface WindowWithBridge {
  ReactNativeWebView?: { postMessage: (msg: string) => void }
  goodWidget?: { provider?: EIP1193Provider }
}

function isBridgeMsg(data: unknown): data is BridgeMessage {
  if (typeof data !== 'object' || data === null) return false
  const msg = data as Record<string, unknown>
  return msg.ns === GW_BRIDGE_NS && typeof msg.type === 'string'
}

function isInIframe(): boolean {
  return typeof window !== 'undefined' && window.parent !== window
}

function isInWebView(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as unknown as WindowWithBridge).ReactNativeWebView
}

function getExistingBridgeProvider(): EIP1193Provider | null {
  if (typeof window === 'undefined') return null
  const win = window as unknown as WindowWithBridge
  return win.goodWidget?.provider ?? null
}

/**
 * Attempt to establish a bridge provider.
 *
 * 1. If a bridge provider is already injected (e.g. by createWebViewBridgeScript
 *    running before the app), returns it immediately.
 * 2. If in an iframe, sends a postMessage handshake to window.parent.
 * 3. If in a React Native WebView, polls for the injected provider to appear.
 * 4. Times out after `timeoutMs` and returns null — the app was not embedded,
 *    or the host doesn't provide a bridge.
 */
export async function tryBridgeHandshake(timeoutMs = 3000): Promise<EIP1193Provider | null> {
  if (typeof window === 'undefined') return null

  const existing = getExistingBridgeProvider()
  if (existing) return existing

  if (isInIframe()) return tryIframeHandshake(timeoutMs)
  if (isInWebView()) return waitForWebViewProvider(timeoutMs)

  return null
}

// ── Iframe path ────────────────────────────────────────────────────

async function tryIframeHandshake(timeoutMs: number): Promise<EIP1193Provider | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler)
      resolve(null)
    }, timeoutMs)

    const handler = (event: MessageEvent) => {
      const data = event.data
      if (!isBridgeMsg(data) || data.type !== 'init-ack') return

      clearTimeout(timeout)
      window.removeEventListener('message', handler)

      const provider = createMinimalBridgeProvider(event.origin, data.sessionId as string)
      installProvider(provider)
      resolve(provider)
    }

    window.addEventListener('message', handler)

    window.parent.postMessage(
      { ns: GW_BRIDGE_NS, version: GW_BRIDGE_VERSION, type: 'init', id: genId() },
      '*',
    )
  })
}

// ── WebView path ───────────────────────────────────────────────────

async function waitForWebViewProvider(timeoutMs: number): Promise<EIP1193Provider | null> {
  const pollInterval = 100

  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs

    const check = () => {
      const provider = getExistingBridgeProvider()
      if (provider) {
        resolve(provider)
        return
      }
      if (Date.now() >= deadline) {
        resolve(null)
        return
      }
      setTimeout(check, pollInterval)
    }

    check()
  })
}

// ── Provider installation ──────────────────────────────────────────

function installProvider(provider: EIP1193Provider): void {
  const win = window as unknown as Record<string, unknown>
  if (!win.goodWidget) win.goodWidget = {}
  ;(win.goodWidget as Record<string, unknown>).provider = provider
}

// ── Minimal bridge provider (iframe only) ──────────────────────────

function createMinimalBridgeProvider(lockedOrigin: string, sessionId: string): EIP1193Provider & { isGoodWidgetBridge: true } {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>()

  const messageHandler = (event: MessageEvent) => {
    if (event.origin !== lockedOrigin) return
    const data = event.data
    if (!isBridgeMsg(data)) return

    if (data.type === 'response') {
      const p = pending.get(data.requestId as string)
      if (!p) return
      pending.delete(data.requestId as string)
      clearTimeout(p.timer)
      if (data.error) {
        const err = data.error as { code?: number; message?: string; data?: unknown }
        const e = new Error(err.message ?? 'Bridge error') as Error & { code: number; data?: unknown }
        e.code = err.code ?? -32603
        e.data = err.data
        p.reject(e)
      } else {
        p.resolve(data.result)
      }
    } else if (data.type === 'event') {
      const eventName = data.event as string
      const set = listeners.get(eventName)
      if (set) set.forEach((fn) => { try { fn(data.data) } catch {} })
    }
  }

  window.addEventListener('message', messageHandler)

  return {
    isGoodWidgetBridge: true as const,

    request(args: RequestArguments): Promise<unknown> {
      return new Promise((resolve, reject) => {
        const id = genId()
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error(`Bridge timeout: ${args.method}`))
        }, 30_000)
        pending.set(id, { resolve, reject, timer })
        window.parent.postMessage(
          { ns: GW_BRIDGE_NS, version: GW_BRIDGE_VERSION, type: 'request', id, sessionId, method: args.method, params: args.params },
          lockedOrigin,
        )
      })
    },

    on<E extends keyof EIP1193EventMap>(event: E, listener: EIP1193EventMap[E]) {
      let set = listeners.get(event)
      if (!set) { set = new Set(); listeners.set(event, set) }
      set.add(listener as (...args: unknown[]) => void)
    },

    removeListener<E extends keyof EIP1193EventMap>(event: E, listener: EIP1193EventMap[E]) {
      listeners.get(event)?.delete(listener as (...args: unknown[]) => void)
    },
  }
}
