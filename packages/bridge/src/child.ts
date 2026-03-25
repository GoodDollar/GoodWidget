/**
 * Child-side entry point.
 *
 * Import from '@goodwidget/bridge/child' in the embedded widget app.
 */
export { BridgeProvider, BridgeRequestError, createBridgeProvider } from './childProvider'
export type { BridgeProviderOptions } from './childProvider'

export { enableIframeBridge } from './enableIframeBridge'
export type { EnableIframeBridgeOptions, IframeBridgeResult } from './enableIframeBridge'

export { injectBridgeProvider, discoverEIP6963Provider } from './inject'
export type { InjectOptions, EIP6963ProviderInfo, EIP6963ProviderDetail } from './inject'

export {
  GW_BRIDGE_VERSION,
  GW_BRIDGE_NS,
  isBridgeMessage,
} from './protocol'
export type { BridgeMessage, ChildCapabilities } from './protocol'
