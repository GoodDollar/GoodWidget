export { GoodWidgetProvider } from './provider'
export type { WalletContextValue, HostContextValue, GoodWidgetContextValue } from './provider'
export { useWallet, useHost, useGoodWidget } from './hooks'
export { detectHost } from './detect'
export { tryBridgeHandshake } from './iframeBridge'

export type {
  EIP1193Provider,
  RequestArguments,
  ProviderRpcError,
  ProviderConnectInfo,
  ProviderMessage,
  EIP1193EventMap,
} from './eip1193'
export { EIP1193_ERROR_CODES } from './eip1193'

export type {
  HostEnvironment,
  HostCapabilities,
  HostDetectionResult,
  WalletState,
  HostState,
  GoodWidgetState,
  GoodWidgetProviderProps,
  GoodWidgetThemeOverrides,
  GoodWidgetConfig,
} from './types'
