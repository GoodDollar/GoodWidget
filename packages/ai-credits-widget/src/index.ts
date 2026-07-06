export { aiCreditsIntegration } from './integration'
export type { AiCreditsIntegration } from './integration'

export type {
  AiCreditsWidgetStatus,
  AiCreditsWidgetTab,
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

export type {
  AiCreditsBackendClient,
  AccountRef,
  AccountStatusResponse,
  AccountView,
  AccountEnrichment,
  GdCreditEntry,
} from './backendClient'
export {
  MockAiCreditsBackendClient,
  ProductionAiCreditsBackendClient,
  createBackendClient,
  buildAccountView,
  enrichAccountView,
  balanceFromProfile,
  creditsBalanceFromStatus,
  usdToCredits,
} from './backendClient'
export type { BuyerOperatorStatus, Eip712SigningPayload } from './operatorConsent'
export type { AiCreditsChainClient } from './chainClient'
export { createChainClient, DEFAULT_BASE_RPC_URL } from './chainClient'

export { useAiCreditsAdapter } from './adapter'
export type { UseAiCreditsAdapterOptions } from './adapter'

export { AiCreditsWidget } from './AiCreditsWidget'
