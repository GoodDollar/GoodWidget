/**
 * <EmbeddedWidget /> — React component for embedding a third-party
 * GoodWidget-based app inside an iframe with a bridged EIP-1193 provider.
 *
 * Usage:
 *   <EmbeddedWidget
 *     src="https://widget.example.com"
 *     provider={walletProvider}
 *     allowedOrigins={['https://widget.example.com']}
 *     themeOverrides={{ tokens: { color: { primary: '#E91E63' } } }}
 *     onReady={() => console.log('widget connected')}
 *     style={{ width: '100%', height: 400, border: 'none' }}
 *   />
 */

import React, { useRef, useEffect, useCallback, type CSSProperties } from 'react'
import type { EIP1193Provider } from '@goodwidget/core'
import type { GoodWidgetThemeOverrides } from '@goodwidget/core'
import { HostRouter } from './hostRouter'
import { GW_BRIDGE_NS, GW_BRIDGE_VERSION, generateId } from './protocol'

export interface EmbeddedWidgetProps {
  /** URL of the widget to load */
  src: string
  /** The host's EIP-1193 provider to bridge to the child */
  provider: EIP1193Provider
  /** Origins allowed for bridge communication */
  allowedOrigins: string[]
  /** Theme overrides to send to the child widget */
  themeOverrides?: GoodWidgetThemeOverrides
  /** Called when the child widget completes the handshake */
  onReady?: (info: { sessionId: string }) => void
  /** Called if the child widget encounters an error */
  onError?: (error: Error) => void
  /** Iframe sandbox attributes (default: 'allow-scripts allow-same-origin') */
  sandbox?: string
  /** CSS style for the iframe */
  style?: CSSProperties
  /** CSS class for the iframe */
  className?: string
  /** Title attribute for accessibility */
  title?: string
}

export function EmbeddedWidget({
  src,
  provider,
  allowedOrigins,
  themeOverrides,
  onReady,
  onError,
  sandbox = 'allow-scripts allow-same-origin',
  style,
  className,
  title = 'Embedded Widget',
}: EmbeddedWidgetProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const routerRef = useRef<HostRouter | null>(null)

  const handleChildConnected = useCallback(
    (info: { sessionId: string; origin: string; appId?: string }) => {
      if (themeOverrides && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            ns: GW_BRIDGE_NS,
            version: GW_BRIDGE_VERSION,
            type: 'event',
            id: generateId(),
            sessionId: info.sessionId,
            event: 'themeOverrides',
            data: themeOverrides,
          },
          allowedOrigins[0] ?? '*',
        )
      }
      onReady?.({ sessionId: info.sessionId })
    },
    [themeOverrides, onReady, allowedOrigins],
  )

  useEffect(() => {
    if (!provider) return

    try {
      const router = new HostRouter({
        provider,
        allowedOrigins,
        onChildConnected: handleChildConnected,
      })
      routerRef.current = router

      return () => {
        router.destroy()
        routerRef.current = null
      }
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)))
    }
  }, [provider, allowedOrigins, handleChildConnected, onError])

  useEffect(() => {
    if (routerRef.current && provider) {
      routerRef.current.setProvider(provider)
    }
  }, [provider])

  return (
    <iframe
      ref={iframeRef}
      src={src}
      sandbox={sandbox}
      style={style}
      className={className}
      title={title}
    />
  )
}
