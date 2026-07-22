export { aiCreditsIntegration } from './integration'
export type { AiCreditsIntegration } from './integration'

export type {
  AiCreditsWidgetStatus,
  AiCreditsWidgetTab,
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
} from './widgetRuntimeContract'

export {
  MockAiCreditsBackendClient,
  ProductionAiCreditsBackendClient,
  createBackendClient,
  buildAccountView,
  enrichAccountView,
  totalCreditUsdFromProfile,
  totalCreditUsdFromStatus,
  usdToCredits,
  DEFAULT_DISCOUNT_CONFIG,
  discountConfigFromConfigValues,
  normalizeDiscountConfig,
} from './backendClient'
export type {
  AiCreditsBackendClient,
  AccountRef,
  AccountStatusResponse,
  AccountView,
  AccountEnrichment,
  DiscountConfig,
  GdCreditEntry,
} from './backendClient'
export type { BuyerOperatorStatus, Eip712SigningPayload } from './operatorConsent'
export type { AiCreditsChainClient } from './chainClient'
export { createChainClient, DEFAULT_BASE_RPC_URL, CELO_GOODID_ADDRESS, DEFAULT_CELO_RPC_URL } from './chainClient'

export { useAiCreditsAdapter } from './adapter'
export type { UseAiCreditsAdapterOptions } from './adapter'

export { AiCreditsWidget } from './AiCreditsWidget'
