// Integration metadata (links this widget to the citizen-sdk capability manifest)
export { connectAWalletIntegration } from './integration'
export type { ConnectAWalletIntegration } from './integration'

// Adapter contract types
export type {
  ConnectAWalletChainId,
  ConnectAWalletChainLinkState,
  ConnectAWalletChainLinkStatus,
  ConnectAWalletLinkErrorDetail,
  ConnectAWalletLinkEventDetail,
  ConnectAWalletWidgetAdapterActions,
  ConnectAWalletWidgetAdapterResult,
  ConnectAWalletWidgetAdapterState,
  ConnectAWalletWidgetEnvironment,
  ConnectAWalletWidgetProps,
  ConnectAWalletWidgetStatus,
} from './widgetRuntimeContract'
export { CONNECT_A_WALLET_CHAINS } from './widgetRuntimeContract'

// Adapter hook
export { useConnectAWalletAdapter } from './adapter'
export type { UseConnectAWalletAdapterOptions } from './adapter'

// Widget component
export { ConnectAWalletWidget, ConnectAWalletWidgetPreview } from './ConnectAWalletWidget'
export type { ConnectAWalletWidgetPreviewProps } from './ConnectAWalletWidget'
