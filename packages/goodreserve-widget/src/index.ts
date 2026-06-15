export { goodReserveWidgetIntegration } from './integration'
export type { GoodReserveWidgetIntegration } from './integration'

export type {
  ReserveSwapDirection,
  ReserveSwapQuoteView,
  ReserveSwapWidgetStatus,
  ReserveSwapWidgetAdapterState,
  ReserveSwapWidgetAdapterActions,
  ReserveSwapWidgetAdapterResult,
  ReserveSwapWidgetProps,
  ReserveSwapSuccessDetail,
  ReserveSwapErrorDetail,
} from './widgetRuntimeContract'

export { useGoodReserveAdapter } from './useGoodReserveAdapter'
export { GoodReserveWidget } from './GoodReserveWidget'

// Test/demo-only SDK injection seam (see sdk.ts). Lets stories/Playwright drive
// the real adapter against a deterministic fake SDK without the published
// package or live RPCs.
export {
  __setGoodReserveSdkConstructorForTesting,
  type GoodReserveSDKLike,
  type GoodReserveSDKConstructor,
  type ReserveStats,
  type ReserveTransactionResult,
} from './sdk'
