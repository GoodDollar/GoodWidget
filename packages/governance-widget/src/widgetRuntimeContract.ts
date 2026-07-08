import type { Address, Hex } from 'viem'
import type { StepperStepItem } from '@goodwidget/ui'
import type { EIP1193Provider, GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/core'
import type {
  BalanceCardProps,
  FundingDistributionChartProps,
  GovernanceHouse,
  GovernanceIdentityStatus,
  GovernanceOnboardingStepId,
  GovernanceProfileDraft,
  ImpactCardProps,
  RankedVotingOption,
} from './types'
import type { GovernanceEnvironmentConfig, GovernanceMemberRecord } from './sdks/contracts'
import type { GovernanceIdentityEnvironment } from './sdks/identity'

export type GovernanceWidgetStatus =
  | 'disconnected'
  | 'loading'
  | 'unsupported_chain'
  | 'onboarding_required'
  | 'pending_alignment'
  | 'active_citizenship'
  | 'active_alignment'
  | 'restake_required'
  | 'vote_detail'
  | 'friendly_error'

export interface GovernanceVotingState {
  voteId: string
  title: string
  summaryLabel: string
  options: RankedVotingOption[]
  recipients: Address[]
  allocationsBps: Record<string, number>
  allocationTotalBps: number
  canVote: boolean
  hasVoted: boolean
  isVotingOpen: boolean
  executed: boolean
  disabledReason?: string
}

export interface GovernanceDashboardState {
  impact: ImpactCardProps
  activeMembers: BalanceCardProps
  alignmentVoting: GovernanceVotingState
  fundingDistribution: FundingDistributionChartProps
}

export interface GovernanceWidgetAdapterState {
  status: GovernanceWidgetStatus
  address: Address | null
  chainId: number | null
  identityStatus: GovernanceIdentityStatus
  identityVerificationUrl: string | null
  member: GovernanceMemberRecord | null
  dashboard: GovernanceDashboardState
  selectedHouse: GovernanceHouse
  disabledHouseOptions: GovernanceHouse[]
  onboardingStepId?: GovernanceOnboardingStepId
  profileDraft: GovernanceProfileDraft
  stakeAmountLabel: string
  transactionSteps: StepperStepItem[]
  registrationHash: Hex | null
  error: string | null
}

export interface GovernanceWidgetAdapterActions {
  connect: () => Promise<void>
  switchToCelo: () => Promise<void>
  refresh: () => Promise<void>
  retry: () => Promise<void>
  selectHouse: (house: GovernanceHouse) => void
  register: (profileDraft: GovernanceProfileDraft) => Promise<void>
  restake: () => Promise<void>
  openVote: () => void
  closeVote: () => void
  setVoteAllocation: (recipientId: string, basisPoints: number) => void
  submitVote: () => Promise<void>
  startIdentityVerification: () => Promise<void>
}

export interface GovernanceWidgetAdapterResult {
  state: GovernanceWidgetAdapterState
  actions: GovernanceWidgetAdapterActions
}

export interface GovernanceWidgetAdapterFactoryInput {
  environment?: GovernanceIdentityEnvironment
  celoRpcUrl?: string
  addresses?: GovernanceEnvironmentConfig
}

export type GovernanceWidgetAdapterFactory = (
  input: GovernanceWidgetAdapterFactoryInput,
) => GovernanceWidgetAdapterResult

export interface GovernanceWidgetProps extends GovernanceWidgetAdapterFactoryInput {
  provider?: EIP1193Provider
  themeOverrides?: GoodWidgetThemeOverrides
  config?: GoodWidgetConfig
  defaultTheme?: 'light' | 'dark'
  adapterFactory?: GovernanceWidgetAdapterFactory
  testId?: string
}
