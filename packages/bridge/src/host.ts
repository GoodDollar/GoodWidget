/**
 * Host-side entry point.
 *
 * Import from '@goodwidget/bridge/host' in the embedding app.
 */
export { HostRouter, createHostRouter } from './hostRouter'
export type { HostRouterOptions } from './hostRouter'

export { createIframeBridgeHost } from './createIframeBridgeHost'
export type { IframeBridgeHostOptions } from './createIframeBridgeHost'

export { createWebViewBridgeScript } from './webviewInjection'
export type { WebViewInjectionOptions } from './webviewInjection'
export { createWebViewBridgeConfig } from './webviewBridgeConfig'
export type {
  CreateWebViewBridgeConfigOptions,
  WebViewBridgeConfig,
  WebViewMessageEventLike,
} from './webviewBridgeConfig'

export { EmbeddedWidget } from './EmbeddedWidget'
export type { EmbeddedWidgetProps } from './EmbeddedWidget'

export {
  GW_BRIDGE_VERSION,
  GW_BRIDGE_NS,
  isBridgeMessage,
} from './protocol'
export type { BridgeMessage } from './protocol'
