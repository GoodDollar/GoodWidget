import React, { useMemo, useRef, useState } from 'react'
import { SafeAreaView, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import { createWebViewBridgeConfig } from '@goodwidget/bridge/host'
import type { EIP1193Provider, RequestArguments, EIP1193EventMap } from '@goodwidget/core'
import { Card, Heading, Text, Alert, YStack } from '@goodwidget/ui'

function createMockHostProvider(): EIP1193Provider {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()

  return {
    async request(args: RequestArguments): Promise<unknown> {
      switch (args.method) {
        case 'eth_chainId':
          return '0xa4ec' // Celo Mainnet
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return ['0x1234567890abcdef1234567890abcdef12345678']
        case 'personal_sign':
          return '0xmocksignature'
        default:
          return { ok: true, method: args.method, params: args.params ?? null }
      }
    },
    on<E extends keyof EIP1193EventMap>(event: E, listener: EIP1193EventMap[E]): void {
      let set = listeners.get(event)
      if (!set) {
        set = new Set()
        listeners.set(event, set)
      }
      set.add(listener as (...args: unknown[]) => void)
    },
    removeListener<E extends keyof EIP1193EventMap>(event: E, listener: EIP1193EventMap[E]): void {
      listeners.get(event)?.delete(listener as (...args: unknown[]) => void)
    },
  }
}

const DEMO_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 16px; color: #222; }
      button { margin: 6px 6px 6px 0; padding: 8px 10px; border-radius: 8px; border: 1px solid #ddd; }
      pre { background: #f5f5f5; border: 1px solid #eee; border-radius: 8px; padding: 10px; font-size: 12px; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <h3>WebView Bridge Child</h3>
    <p>This page calls <code>window.ethereum</code> provided by the host bridge.</p>
    <button id="chain">eth_chainId</button>
    <button id="accounts">eth_requestAccounts</button>
    <button id="custom">custom_method</button>
    <pre id="out">Ready...</pre>
    <script>
      const out = document.getElementById('out')
      function log(v) {
        out.textContent = typeof v === 'string' ? v : JSON.stringify(v, null, 2)
      }
      async function run(method, params) {
        try {
          if (!window.ethereum) throw new Error('window.ethereum not injected yet')
          const result = await window.ethereum.request({ method, params })
          log({ method, result })
        } catch (e) {
          log({ method, error: String(e && e.message ? e.message : e) })
        }
      }
      document.getElementById('chain').onclick = () => run('eth_chainId')
      document.getElementById('accounts').onclick = () => run('eth_requestAccounts')
      document.getElementById('custom').onclick = () => run('goodwidget_demo_ping', { hello: 'world' })
    </script>
  </body>
</html>`

export default function WebViewBridgeScreen() {
  const webViewRef = useRef<WebView>(null)
  const [status, setStatus] = useState('waiting for child handshake...')
  const provider = useMemo(() => createMockHostProvider(), [])

  const bridge = useMemo(
    () =>
      createWebViewBridgeConfig({
        provider,
        sendToWebView: (message) => webViewRef.current?.postMessage(message),
        onReady: (sessionId) => setStatus(`connected (${sessionId})`),
      }),
    [provider],
  )

  return (
    <SafeAreaView style={styles.container}>
      <YStack gap="$3" padding="$3">
        <Heading level={3}>WebView Bridge Demo</Heading>
        <Alert
          type="info"
          title="Live End-to-End Demo"
          message="This WebView is actually bridged. Buttons inside the WebView call window.ethereum.request() and are handled by the host helper."
        />
        <Card>
          <Text variant="label">Bridge status</Text>
          <Text>{status}</Text>
        </Card>
        <WebView
          ref={webViewRef}
          source={{ html: DEMO_HTML }}
          injectedJavaScript={bridge.injectedJavaScript}
          onMessage={(event) => {
            void bridge.onMessage(event)
          }}
          style={styles.webview}
        />
      </YStack>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  webview: {
    flex: 1,
    minHeight: 450,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
})
