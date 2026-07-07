import type { ButtonProps, StepperStepItem, IconName } from '@goodwidget/ui'

export type GovernanceHouse = 'citizenship' | 'alignment'

export type GovernanceOnboardingStepId = 'welcome' | 'house' | 'profile' | 'stake' | 'success'

export interface GovernanceWizardData extends Record<string, unknown> {
  selectedHouse?: GovernanceHouse
  profileDraft: GovernanceProfileDraft
}

export type GovernanceIdentityStatus = 'verified' | 'unverified'

export interface GovernanceProfileDraft {
  name?: string
  socialLinks?: string
  projectWebpage?: string
  missionStatement?: string
  distributionStrategy?: string
}

export type GovernanceProfileFieldKey = keyof GovernanceProfileDraft

export type GovernanceProfileFieldErrors = Partial<Record<GovernanceProfileFieldKey, string>>

export interface GovernanceOnboardingAction {
  id: string
  label: string
  variant?: ButtonProps['variant']
  disabled?: boolean
}

export interface GovernanceOnboardingWidgetProps {
  currentStepId?: GovernanceOnboardingStepId
  initialStepId?: GovernanceOnboardingStepId
  identityStatus?: GovernanceIdentityStatus
  /**
   * Connected wallet address shown in the welcome step. The widget is
   * presentational, so a parent integration supplies the address instead of
   * the widget reading provider state directly.
   */
  walletAddress?: string
  initialHouse?: GovernanceHouse
  disabledHouseOptions?: GovernanceHouse[]
  initialProfileDraft?: GovernanceProfileDraft
  initialFieldErrors?: GovernanceProfileFieldErrors
  stakeAmountLabel?: string
  transactionSteps?: StepperStepItem[]
  finalActions?: GovernanceOnboardingAction[]
  dataTestId?: string
  onStepChange?: (stepId: GovernanceOnboardingStepId) => void
  onFinalActionPress?: (actionId: string) => void
}
export interface GovernanceAmount {
  value: string | number
  token?: string
  isStreaming?: boolean
  streamLabel?: string
}

export interface ImpactCardMetric {
  label: string
  amount: GovernanceAmount
  description?: string
}

export interface ImpactCardProps {
  title: string
  metrics: [ImpactCardMetric, ImpactCardMetric]
  description: string
  ctaLabel?: string
  ctaDisabled?: boolean
  onCtaPress?: () => void
  testID?: string
}

export interface BalanceCardMetadata {
  label: string
  tone?: 'default' | 'positive' | 'muted'
  icon?: IconName
}

export interface BalanceCardProps {
  icon: IconName
  title: string
  amount: GovernanceAmount | string | number
  amountType?: 'token' | 'raw'
  metadataType?: 'growth' | 'time-window'
  metadata: BalanceCardMetadata
  compact?: boolean
  testID?: string
}

export interface RankedVotingOption {
  id: string
  label: string
  percentage: number
}

export interface AlignmentVotingProposalCardProps {
  id: string
  categoryLabel: string
  title: string
  summaryLabel?: string
  options: RankedVotingOption[]
  maxVisibleOptions?: number
  onPress?: (id: string) => void
  testID?: string
}

export interface VoteSegment {
  id: string
  label: string
  percentage: number
  tone?: 'for' | 'against' | 'abstain' | 'neutral'
}

export interface VoterPreview {
  id: string
  label: string
  avatarUrl?: string
}

export interface OptimisticVotingProposalCardProps {
  id: string
  categoryLabel: string
  title: string
  quorumLabel?: string
  quorumReachedPercent: number
  voteSegments: VoteSegment[]
  voters: VoterPreview[]
  remainingVoterCountLabel?: string
  statusLabel?: string
  statusTone?: 'warning' | 'muted' | 'positive'
  onPress?: (id: string) => void
  testID?: string
}

export interface FundingProjectAllocation {
  id: string
  name: string
  amount: GovernanceAmount
  percentage: number
}

export interface FundingDistributionChartProps {
  title?: string
  centerLabel?: string
  emptyStateLabel?: string
  totalAmount: GovernanceAmount
  projects: FundingProjectAllocation[]
  isStreaming?: boolean
  onProjectPress?: (id: string) => void
  testID?: string
}
