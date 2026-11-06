// Runtime contract types
export type {
  BridgingWidgetProps,
  BridgingWidgetTab,
  BridgingChainId,
  BridgingWidgetAdapterState,
  BridgingWidgetAdapterActions,
  BridgingWidgetAdapterResult,
} from './widgetRuntimeContract'
export { BRIDGING_CHAINS } from './widgetRuntimeContract'

// Bridging SDK domain types used in the adapter state, re-exported so
// consumers (e.g. Storybook fixtures) can build full state objects without
// taking a direct dependency on @goodsdks/bridging-sdk themselves.
export type {
  BridgeConfig,
  BridgeFeeQuote,
  BridgeProtocol,
  BridgeRequirement,
  BridgeTransaction,
} from '@goodsdks/bridging-sdk'

// Adapter hook
export { useBridgingAdapter } from './adapter'

// Widget component
export { BridgingWidget, BridgingWidgetPreview } from './BridgingWidget'
export type { BridgingWidgetPreviewProps } from './BridgingWidget'
