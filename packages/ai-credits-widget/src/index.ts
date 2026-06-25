// Integration metadata
export { aiCreditsIntegration } from './integration'
export type { AiCreditsIntegration } from './integration'

// Adapter contract types
export type {
  AiCreditsWidgetStatus,
  AiCreditsWidgetPrimaryAction,
  AiCreditsWidgetAdapterState,
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterResult,
  AiCreditsWidgetAdapterFactory,
  AiCreditsWidgetAdapterFactoryInput,
  AiCreditsWidgetEnvironment,
  AiCreditsWidgetProps,
  AiCreditsPaySuccessDetail,
  AiCreditsPayErrorDetail,
  AiCreditsQuote,
  AiCreditsUsageEntry,
} from './widgetRuntimeContract'

// Backend client
export type { AiCreditsBackendClient, AccountRef, AccountStatusResponse } from './mockBackendClient'
export {
  MockAiCreditsBackendClient,
  ProductionAiCreditsBackendClient,
  createBackendClient,
  microUsdToCredits,
} from './mockBackendClient'
export type { BuyerOperatorStatus, Eip712SigningPayload } from './operatorConsent'

// Adapter hook
export { useAiCreditsAdapter } from './adapter'
export type { UseAiCreditsAdapterOptions } from './adapter'

// Widget component
export { AiCreditsWidget } from './AiCreditsWidget'
