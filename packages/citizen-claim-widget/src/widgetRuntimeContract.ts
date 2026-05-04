export type CitizenClaimWidgetEnvironment =
  | 'production'
  | 'staging'
  | 'development'

export type CitizenClaimWidgetStatus =
  | 'loading'
  | 'not_connected'
  | 'not_whitelisted'
  | 'eligible'
  | 'already_claimed'
  | 'claiming'
  | 'success'
  | 'error'

export type CitizenClaimWidgetPrimaryAction =
  | 'connect'
  | 'verify'
  | 'claim'
  | 'refresh'
  | 'switch_chain'
  | 'none'

export interface CitizenClaimWidgetSuccessDetail {
  address: string
  chainId: number
  transactionHash?: string
}

export interface CitizenClaimWidgetErrorDetail {
  address: string | null
  chainId: number | null
  message: string
}

export interface CitizenClaimWidgetAdapterState {
  status: CitizenClaimWidgetStatus
  address: string | null
  chainId: number | null
  amount: string | null
  token: 'G$'
  primaryAction: CitizenClaimWidgetPrimaryAction
  primaryLabel: string
  error: string | null
}

export interface CitizenClaimWidgetAdapterActions {
  connect: () => Promise<void>
  refresh: () => Promise<void>
  startVerification: () => Promise<void>
  claim: () => Promise<unknown>
  switchChain?: (chainId: number) => Promise<void>
}

export interface CitizenClaimWidgetAdapterResult {
  state: CitizenClaimWidgetAdapterState
  actions: CitizenClaimWidgetAdapterActions
}

export interface CitizenClaimWidgetClientFactoryInput {
  provider: unknown
  address: string
  chainId: number
}

export interface CitizenClaimWidgetClientBundle {
  readClient: unknown
  walletClient: unknown
}

export type CitizenClaimWidgetClientFactory = (
  input: CitizenClaimWidgetClientFactoryInput,
) => CitizenClaimWidgetClientBundle | Promise<CitizenClaimWidgetClientBundle>

export interface CitizenClaimWidgetProps {
  provider?: unknown
  environment?: CitizenClaimWidgetEnvironment | string
  clientFactory?: CitizenClaimWidgetClientFactory
  onClaimSuccess?: (detail: CitizenClaimWidgetSuccessDetail) => void
  onClaimError?: (detail: CitizenClaimWidgetErrorDetail) => void
}

