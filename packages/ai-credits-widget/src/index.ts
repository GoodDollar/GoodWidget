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
  SignerKeyEntry,
} from './widgetRuntimeContract'

export {
  parseDeepLinkParams,
  resolveDeepLinkParams,
  isValidSignerAddress,
  isValidOperatorSignature,
  storeDeepLinkParams,
  readStoredDeepLinkParams,
  clearStoredDeepLinkParams,
  clearDeepLinkArtifacts,
  deepLinkManualFallbackMessage,
  DEEP_LINK_MANUAL_FALLBACK_HINT,
} from './deepLinkParams'
export type { DeepLinkParams, DeepLinkParseResult } from './deepLinkParams'

export type {
  AiCreditsBackendClient,
  AccountRef,
  AccountStatusResponse,
  AccountView,
  AccountEnrichment,
  DiscountConfig,
  GdCreditEntry,
} from './backendClient'
export {
  ProductionAiCreditsBackendClient,
  UnavailableAiCreditsBackendClient,
  createBackendClient,
  buildAccountView,
  enrichAccountView,
  totalCreditUsdFromProfile,
  totalCreditUsdFromStatus,
  usdToCredits,
  DEFAULT_DISCOUNT_CONFIG,
} from './backendClient'
export type { SignerOperatorStatus, Eip712SigningPayload } from './operatorConsent'
export type { AiCreditsChainClient } from './chainClient'
export { createChainClient, DEFAULT_BASE_RPC_URL, CELO_GOODID_ADDRESS, DEFAULT_CELO_RPC_URL } from './chainClient'

export { useAiCreditsAdapter } from './adapter'
export type { UseAiCreditsAdapterOptions } from './adapter'

export { AiCreditsWidget } from './AiCreditsWidget'
