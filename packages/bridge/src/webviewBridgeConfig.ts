import type { EIP1193Provider } from '@goodwidget/core'
import {
  GW_BRIDGE_NS,
  GW_BRIDGE_VERSION,
  generateId,
  type BridgeMessage,
  type BridgeRequestMessage,
} from './protocol'
import { createWebViewBridgeScript, type WebViewInjectionOptions } from './webviewInjection'

export interface WebViewMessageEventLike {
  nativeEvent: {
    data: string
  }
}

export interface CreateWebViewBridgeConfigOptions {
  provider: EIP1193Provider
  sendToWebView: (serializedMessage: string) => void
  injection?: WebViewInjectionOptions
  onReady?: (sessionId: string) => void
}

export interface WebViewBridgeConfig {
  injectedJavaScript: string
  onMessage: (event: WebViewMessageEventLike) => Promise<void>
}

function parseBridgeMessage(raw: string): BridgeMessage | null {
  try {
    const parsed = JSON.parse(raw) as BridgeMessage
    if (parsed?.ns !== GW_BRIDGE_NS) return null
    return parsed
  } catch {
    return null
  }
}

function serializeBridgeMessage(message: Record<string, unknown>): string {
  return JSON.stringify(message)
}

export function createWebViewBridgeConfig(
  options: CreateWebViewBridgeConfigOptions,
): WebViewBridgeConfig {
  const { provider, sendToWebView, injection, onReady } = options

  let sessionId: string | null = null

  async function onMessage(event: WebViewMessageEventLike): Promise<void> {
    const msg = parseBridgeMessage(event.nativeEvent.data)
    if (!msg) return

    if (msg.type === 'init') {
      sessionId = generateId()
      let accounts: string[] | undefined
      let chainId: string | undefined

      try {
        accounts = (await provider.request({ method: 'eth_accounts' })) as string[]
      } catch {
        accounts = undefined
      }

      try {
        chainId = (await provider.request({ method: 'eth_chainId' })) as string
      } catch {
        chainId = undefined
      }

      sendToWebView(
        serializeBridgeMessage({
          ns: GW_BRIDGE_NS,
          version: GW_BRIDGE_VERSION,
          type: 'init-ack',
          id: generateId(),
          sessionId,
          initialState: { accounts, chainId },
        }),
      )

      onReady?.(sessionId)
      return
    }

    if (msg.type !== 'request') return
    if (!sessionId) return
    const requestMsg = msg as BridgeRequestMessage

    try {
      const result = await provider.request({
        method: requestMsg.method,
        params: requestMsg.params as
          | readonly unknown[]
          | Record<string, unknown>
          | undefined,
      })

      sendToWebView(
        serializeBridgeMessage({
          ns: GW_BRIDGE_NS,
          version: GW_BRIDGE_VERSION,
          type: 'response',
          id: generateId(),
          sessionId,
          requestId: msg.id,
          result,
        }),
      )
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string; data?: unknown }
      sendToWebView(
        serializeBridgeMessage({
          ns: GW_BRIDGE_NS,
          version: GW_BRIDGE_VERSION,
          type: 'response',
          id: generateId(),
          sessionId,
          requestId: msg.id,
          error: {
            code: err.code ?? -32603,
            message: err.message ?? 'Internal error',
            data: err.data,
          },
        }),
      )
    }
  }

  return {
    injectedJavaScript: createWebViewBridgeScript(injection),
    onMessage,
  }
}
