// Protocol
export {
  GW_BRIDGE_VERSION,
  GW_BRIDGE_NS,
  generateId,
  isBridgeMessage,
} from './protocol'
export type {
  BridgeMessageType,
  BridgeEnvelope,
  BridgeInitMessage,
  BridgeInitAckMessage,
  BridgeRequestMessage,
  BridgeResponseMessage,
  BridgeEventMessage,
  BridgeRpcError,
  BridgeProviderEvent,
  BridgeMessage,
  ChildCapabilities,
} from './protocol'

// Child-side provider
export { BridgeProvider, BridgeRequestError, createBridgeProvider } from './childProvider'
export type { BridgeProviderOptions } from './childProvider'

// Child opt-in helper
export { enableIframeBridge } from './enableIframeBridge'
export type { EnableIframeBridgeOptions, IframeBridgeResult } from './enableIframeBridge'

// Host-side router
export { HostRouter, createHostRouter } from './hostRouter'
export type { HostRouterOptions } from './hostRouter'

// Host-side iframe convenience
export { createIframeBridgeHost } from './createIframeBridgeHost'
export type { IframeBridgeHostOptions } from './createIframeBridgeHost'

// Injection (window.ethereum + EIP-6963)
export { injectBridgeProvider, discoverEIP6963Provider } from './inject'
export type {
  InjectOptions,
  EIP6963ProviderInfo,
  EIP6963ProviderDetail,
} from './inject'

// WebView injection script
export { createWebViewBridgeScript } from './webviewInjection'
export type { WebViewInjectionOptions } from './webviewInjection'
export { createWebViewBridgeConfig } from './webviewBridgeConfig'
export type {
  CreateWebViewBridgeConfigOptions,
  WebViewBridgeConfig,
  WebViewMessageEventLike,
} from './webviewBridgeConfig'

// React component
export { EmbeddedWidget } from './EmbeddedWidget'
export type { EmbeddedWidgetProps } from './EmbeddedWidget'
