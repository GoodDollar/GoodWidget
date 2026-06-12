import type { IconName } from '@goodwidget/ui'

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
  totalAmount: GovernanceAmount
  projects: FundingProjectAllocation[]
  isStreaming?: boolean
  onProjectPress?: (id: string) => void
  testID?: string
}
