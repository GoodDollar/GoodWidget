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
  | 'revoked'
  | 'vote_detail'
  | 'friendly_error'

export type GovernanceTransactionKind = 'registration' | 'unstake' | 'vote'

export type GovernanceTransactionStatus =
  | 'idle'
  | 'wallet_confirmation'
  | 'submitted'
  | 'confirmed'
  | 'rejected'
  | 'reverted'
  | 'failed'

export interface GovernanceTransactionState {
  kind: GovernanceTransactionKind | null
  status: GovernanceTransactionStatus
  hash: Hex | null
  error: string | null
}

export interface GovernanceUnstakeAvailability {
  canUnstake: boolean
  unlockAt: number | null
  disabledReason?: string
}

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
  finalizedUnits: Record<string, string>
  disabledReason?: string
}

export const GOVERNANCE_ALLOCATION_TOTAL_ERROR =
  'Allocation totals must equal exactly 10,000 basis points.'

export function getGovernanceVotingDisabledReason(
  voting: GovernanceVotingState,
): string | undefined {
  if (voting.disabledReason) return voting.disabledReason
  return voting.canVote && voting.allocationTotalBps !== 10_000
    ? GOVERNANCE_ALLOCATION_TOTAL_ERROR
    : undefined
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
  minimumStakeAmounts: Record<GovernanceHouse, bigint>
  transactionSteps: StepperStepItem[]
  registrationHash: Hex | null
  transaction: GovernanceTransactionState
  unstakeAvailability: GovernanceUnstakeAvailability
  lifecycleNotice: string | null
  error: string | null
}

export interface GovernanceWidgetAdapterActions {
  connect: () => Promise<void>
  switchToCelo: () => Promise<void>
  refresh: () => Promise<void>
  retry: () => Promise<void>
  selectHouse: (house: GovernanceHouse) => void
  register: (profileDraft: GovernanceProfileDraft) => Promise<void>
  unstake: () => Promise<void>
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
