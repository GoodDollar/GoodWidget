// Integration metadata (links this widget to the citizen-sdk capability manifest)
export { citizenClaimIntegration } from './integration'
export type { CitizenClaimIntegration } from './integration'

// Adapter contract types
export type {
  CitizenClaimWidgetAdapterActions,
  CitizenClaimWidgetAdapterResult,
  CitizenClaimWidgetAdapterState,
  CitizenClaimWidgetClientBundle,
  CitizenClaimWidgetClientsByChain,
  CitizenClaimWidgetClientFactory,
  CitizenClaimWidgetClientFactoryInput,
  CitizenClaimWidgetChainClaimResult,
  CitizenClaimWidgetCustodialExecution,
  CitizenClaimWidgetEnvironment,
  CitizenClaimWidgetErrorDetail,
  CitizenClaimWidgetPrimaryAction,
  CitizenClaimWidgetProps,
  CitizenClaimWidgetStatus,
  CitizenClaimWidgetSuccessDetail,
  CitizenClaimWidgetWalletClient,
} from './widgetRuntimeContract'

export { createCitizenClaimWidgetCustodialExecution } from './custodial'

// Adapter hook
export { useCitizenClaimAdapter } from './adapter'
export type { UseCitizenClaimAdapterOptions } from './adapter'

// Widget component
export { CitizenClaimWidget } from './CitizenClaimWidget'
