// Integration metadata (links this widget to the citizen-sdk capability manifest)
export { citizenClaimIntegration } from './integration'
export type { CitizenClaimIntegration } from './integration'

// Adapter contract types
export type {
  CitizenClaimWidgetAdapterActions,
  CitizenClaimWidgetAdapterResult,
  CitizenClaimWidgetAdapterState,
  CitizenClaimWidgetClientBundle,
  CitizenClaimWidgetClientFactory,
  CitizenClaimWidgetClientFactoryInput,
  CitizenClaimWidgetEnvironment,
  CitizenClaimWidgetErrorDetail,
  CitizenClaimWidgetPrimaryAction,
  CitizenClaimWidgetProps,
  CitizenClaimWidgetStatus,
  CitizenClaimWidgetSuccessDetail,
} from './widgetRuntimeContract'

// Adapter hook
export { useCitizenClaimAdapter } from './adapter'
export type { UseCitizenClaimAdapterOptions } from './adapter'

// Shared InviteSDK adapter contract and deterministic code helpers.
export {
  decodeInviteCode,
  encodeInviteCode,
  formatInviteBounty,
  generateInviteCode,
  useInviteAdapter,
} from './inviteAdapter'
export type {
  InviteActions,
  InviteAdapterResult,
  InviteState,
  InviteStatus,
} from './inviteAdapter'

// Widget component
export { CitizenClaimWidget } from './CitizenClaimWidget'
