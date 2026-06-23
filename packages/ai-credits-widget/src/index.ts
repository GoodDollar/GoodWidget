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
export type { AiCreditsBackendClient } from './mockBackendClient'
export { MockAiCreditsBackendClient, ProductionAiCreditsBackendClient, createBackendClient } from './mockBackendClient'

// Adapter hook
export { useAiCreditsAdapter } from './adapter'
export type { UseAiCreditsAdapterOptions } from './adapter'

// Widget component
export { AiCreditsWidget } from './AiCreditsWidget'
