
import Svg, { Circle, G } from 'react-native-svg'
import { Stack, useTheme } from 'tamagui'
import {
  Badge,
  BadgeText,
  Button,
  ButtonText,
  Card,
  Heading,
  Icon,
  Text,
  TokenAmount,
  XStack,
  YStack,
} from '@goodwidget/ui'
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

const SEGMENT_TONES: Record<NonNullable<VoteSegment['tone']>, string> = {
  for: '$primary',
  against: '$error',
  abstain: '$placeholderColor',
  neutral: '$success',
}

const DONUT_COLOR_KEYS = ['primary', 'success', 'warning', 'info', 'error'] as const

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(100, value))
}

function formatRawValue(value: string | number): string {
  if (typeof value === 'string') {
    return value
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

function isGovernanceAmount(value: GovernanceAmount | string | number): value is GovernanceAmount {
  return typeof value === 'object' && value !== null && 'value' in value
}

function resolveThemeColor(theme: ReturnType<typeof useTheme>, key: string, fallback: string): string {
  const themeValue = theme[key as keyof typeof theme]

  if (themeValue && typeof themeValue === 'object' && 'val' in themeValue) {
    return String(themeValue.val)
  }

  return fallback
}

function renderGovernanceAmount(amount: GovernanceAmount, size: 'sm' | 'md' | 'lg' | 'xl' = 'lg') {
  return (
    <YStack gap="$1">
      {amount.token ? (
        <TokenAmount amount={amount.value} token={amount.token} size={size} />
      ) : (
        <Heading level={size === 'xl' ? 2 : 4}>{formatRawValue(amount.value)}</Heading>
      )}
      {amount.isStreaming ? (
        <Text variant="caption" tone="secondary">
          {amount.streamLabel ?? 'Live stream'}
        </Text>
      ) : null}
    </YStack>
  )
}

function MetricBox({ metric }: { metric: ImpactCardMetric }) {
  return (
    <YStack
      flex={1}
      minWidth={140}
      gap="$2"
      padding="$3"
      borderRadius="$3"
      backgroundColor="$backgroundHover"
      borderWidth={1}
      borderColor="$borderColor"
    >
      <Text variant="label" tone="secondary">
        {metric.label}
      </Text>
      {renderGovernanceAmount(metric.amount, 'lg')}
      {metric.description ? (
        <Text variant="caption" tone="dim">
          {metric.description}
        </Text>
      ) : null}
    </YStack>
  )
}

function ProposalHeader({ categoryLabel }: { categoryLabel: string }) {
  return (
    <XStack alignItems="center" justifyContent="space-between" gap="$3">
      <Badge type="info">
        <BadgeText>{categoryLabel}</BadgeText>
      </Badge>
      <Icon name="chevron-right" size="sm" color="muted" />
    </XStack>
  )
}

function ProgressBar({ percentage, colorToken = '$primary' }: { percentage: number; colorToken?: string }) {
  return (
    <Stack height={8} borderRadius="$full" backgroundColor="$backgroundPress" overflow="hidden">
      <Stack width={`${clampPercentage(percentage)}%`} height="100%" backgroundColor={colorToken} />
    </Stack>
  )
}

function RankedOptionRow({ option }: { option: RankedVotingOption }) {
  return (
    <YStack gap="$2">
      <XStack alignItems="center" justifyContent="space-between" gap="$3">
        <Text variant="label" truncate flex={1}>
          {option.label}
        </Text>
        <Text variant="label" bold noWrap>
          {clampPercentage(option.percentage)}%
        </Text>
      </XStack>
      <ProgressBar percentage={option.percentage} />
    </YStack>
  )
}

function StackedProgressBar({ segments }: { segments: VoteSegment[] }) {
  return (
    <XStack height={12} borderRadius="$full" backgroundColor="$backgroundPress" overflow="hidden">
      {segments.map((segment) => (
        <Stack
          key={segment.id}
          width={`${clampPercentage(segment.percentage)}%`}
          height="100%"
          backgroundColor={SEGMENT_TONES[segment.tone ?? 'neutral']}
        />
      ))}
    </XStack>
  )
}

function VoterAvatar({ voter, index }: { voter: VoterPreview; index: number }) {
  const initial = voter.label.trim().slice(0, 1).toUpperCase() || '?'

  return (
    <Stack
      width={32}
      height={32}
      marginLeft={index === 0 ? 0 : -8}
      borderRadius="$full"
      borderWidth={2}
      borderColor="$background"
      backgroundColor="$backgroundPress"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
    >
      {voter.avatarUrl ? (
        <img src={voter.avatarUrl} alt={voter.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Text variant="caption" bold>
          {initial}
        </Text>
      )}
    </Stack>
  )
}

function VoterPreviewGroup({ voters, remainingLabel }: { voters: VoterPreview[]; remainingLabel?: string }) {
  return (
    <XStack alignItems="center" gap="$2">
      <XStack alignItems="center">
        {voters.slice(0, 4).map((voter, index) => (
          <VoterAvatar key={voter.id} voter={voter} index={index} />
        ))}
      </XStack>
      {remainingLabel ? (
        <Badge>
          <BadgeText>{remainingLabel}</BadgeText>
        </Badge>
      ) : null}
    </XStack>
  )
}

function VoteLegend({ segments }: { segments: VoteSegment[] }) {
  return (
    <XStack flexWrap="wrap" gap="$3">
      {segments.map((segment) => (
        <XStack key={segment.id} alignItems="center" gap="$2">
          <Stack
            width={10}
            height={10}
            borderRadius="$full"
            backgroundColor={SEGMENT_TONES[segment.tone ?? 'neutral']}
          />
          <Text variant="caption" tone="secondary">
            {segment.label} {clampPercentage(segment.percentage)}%
          </Text>
        </XStack>
      ))}
    </XStack>
  )
}

function fundingAmountLabel(amount: GovernanceAmount): string {
  const base = amount.token ? `${formatRawValue(amount.value)} ${amount.token}` : formatRawValue(amount.value)

  if (amount.isStreaming) {
    return `${base} streaming`
  }

  return base
}

function FundingLegend({
  projects,
  colors,
  onProjectPress,
}: {
  projects: FundingProjectAllocation[]
  colors: string[]
  onProjectPress?: (id: string) => void
}) {
  if (projects.length === 0) {
    return (
      <YStack padding="$3" borderRadius="$3" backgroundColor="$backgroundHover">
        <Text tone="secondary">No active funding distribution yet.</Text>
      </YStack>
    )
  }

  return (
    <YStack gap="$2" flex={1} minWidth={220}>
      {projects.map((project, index) => (
        <Button
          key={project.id}
          variant="list"
          onPress={onProjectPress ? () => onProjectPress(project.id) : undefined}
          aria-label={`Open ${project.name} allocation`}
        >
          <Stack width={12} height={12} borderRadius="$full" backgroundColor={colors[index]} />
          <YStack flex={1} gap="$1">
            <Text variant="label" truncate>
              {project.name}
            </Text>
            <Text variant="caption" tone="secondary">
              {fundingAmountLabel(project.amount)}
            </Text>
          </YStack>
          <Text variant="label" bold noWrap>
            {clampPercentage(project.percentage)}%
          </Text>
        </Button>
      ))}
    </YStack>
  )
}

function FundingDonut({
  projects,
  totalAmount,
  colors,
  onProjectPress,
}: {
  projects: FundingProjectAllocation[]
  totalAmount: GovernanceAmount
  colors: string[]
  onProjectPress?: (id: string) => void
}) {
  const size = 196
  const strokeWidth = 22
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <Stack width={size} height={size} alignItems="center" justifyContent="center">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityRole="image">
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors[0]}
            strokeOpacity={projects.length === 0 ? 0.18 : 0.08}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {projects.map((project, index) => {
            const percentage = clampPercentage(project.percentage)
            const dashLength = (percentage / 100) * circumference
            const dashOffset = -offset
            offset += dashLength

            return (
              <Circle
                key={project.id}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={colors[index]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                fill="transparent"
                onPress={onProjectPress ? () => onProjectPress(project.id) : undefined}
              />
            )
          })}
        </G>
      </Svg>
      <YStack position="absolute" alignItems="center" justifyContent="center" gap="$1" maxWidth={128}>
        {renderGovernanceAmount(totalAmount, 'md')}
        <Text variant="caption" tone="secondary" center>
          Total active funding
        </Text>
      </YStack>
    </Stack>
  )
}

export function ImpactCard({
  title,
  metrics,
  description,
  ctaLabel,
  ctaDisabled = false,
  onCtaPress,
  testID,
}: ImpactCardProps) {
  return (
    <Card data-testid={testID} width="100%" maxWidth={520} gap="$4">
      <Heading level={3}>{title}</Heading>
      <XStack flexWrap="wrap" gap="$3">
        {metrics.map((metric) => (
          <MetricBox key={metric.label} metric={metric} />
        ))}
      </XStack>
      <Text tone="secondary">{description}</Text>
      {ctaLabel ? (
        <Button fullWidth disabled={ctaDisabled} onPress={onCtaPress} aria-label={ctaLabel}>
          <ButtonText>{ctaLabel}</ButtonText>
        </Button>
      ) : null}
    </Card>
  )
}

export function BalanceCard({
  icon,
  title,
  amount,
  amountType = 'token',
  metadata,
  compact = false,
  testID,
}: BalanceCardProps) {
  const amountValue = isGovernanceAmount(amount) ? amount : { value: amount, token: amountType === 'token' ? 'G$' : undefined }
  const metadataTone = metadata.tone === 'positive' ? 'default' : metadata.tone === 'muted' ? 'secondary' : 'soft'

  return (
    <Card data-testid={testID} width="100%" maxWidth={compact ? 220 : 268} minHeight={compact ? 150 : 176} gap="$3">
      <XStack alignItems="center" gap="$2">
        <Icon name={icon} size="sm" color="primary" round />
        <Text variant="label" truncate flex={1}>
          {title}
        </Text>
      </XStack>
      {renderGovernanceAmount(amountValue, compact ? 'md' : 'lg')}
      <XStack alignItems="center" gap="$2" marginTop="auto">
        {metadata.icon ? <Icon name={metadata.icon} size="xs" color={metadata.tone === 'positive' ? 'success' : 'muted'} /> : null}
        <Text variant="caption" tone={metadataTone} truncate>
          {metadata.label}
        </Text>
      </XStack>
    </Card>
  )
}

export function AlignmentVotingProposalCard({
  id,
  categoryLabel,
  title,
  summaryLabel = 'Current top voted',
  options,
  maxVisibleOptions = 3,
  onPress,
  testID,
}: AlignmentVotingProposalCardProps) {
  const visibleOptions = options.slice(0, maxVisibleOptions)
  const hiddenCount = Math.max(0, options.length - visibleOptions.length)

  return (
    <Card
      data-testid={testID}
      width="100%"
      maxWidth={480}
      gap="$4"
      cursor={onPress ? 'pointer' : undefined}
      onPress={onPress ? () => onPress(id) : undefined}
      role={onPress ? 'button' : undefined}
      aria-label={`Open proposal ${title}`}
    >
      <ProposalHeader categoryLabel={categoryLabel} />
      <Heading level={4}>{title}</Heading>
      <XStack alignItems="center" gap="$2">
        <Icon name="info" size="xs" color="muted" />
        <Text variant="caption" tone="secondary">
          {summaryLabel}
        </Text>
      </XStack>
      <YStack gap="$3">
        {visibleOptions.map((option) => (
          <RankedOptionRow key={option.id} option={option} />
        ))}
        {hiddenCount > 0 ? (
          <Text variant="caption" tone="secondary">
            +{hiddenCount} more options
          </Text>
        ) : null}
      </YStack>
    </Card>
  )
}

export function OptimisticVotingProposalCard({
  id,
  categoryLabel,
  title,
  quorumLabel = 'Current vote quorum',
  quorumReachedPercent,
  voteSegments,
  voters,
  remainingVoterCountLabel,
  onPress,
  testID,
}: OptimisticVotingProposalCardProps) {
  return (
    <Card
      data-testid={testID}
      width="100%"
      maxWidth={480}
      gap="$4"
      cursor={onPress ? 'pointer' : undefined}
      onPress={onPress ? () => onPress(id) : undefined}
      role={onPress ? 'button' : undefined}
      aria-label={`Open proposal ${title}`}
    >
      <ProposalHeader categoryLabel={categoryLabel} />
      <Heading level={4}>{title}</Heading>
      <YStack gap="$2">
        <XStack alignItems="center" justifyContent="space-between" gap="$3">
          <Text variant="caption" tone="secondary">
            {quorumLabel}
          </Text>
          <Text variant="label" bold noWrap>
            {clampPercentage(quorumReachedPercent)}% reached
          </Text>
        </XStack>
        <Stack position="relative">
          <Stack height={12} borderRadius="$full" backgroundColor="$backgroundPress" overflow="hidden">
            <Stack width={`${clampPercentage(quorumReachedPercent)}%`} height="100%" backgroundColor="$backgroundHover" />
          </Stack>
          <Stack position="absolute" left={0} right={0} top={0} bottom={0}>
            <StackedProgressBar segments={voteSegments} />
          </Stack>
        </Stack>
      </YStack>
      <VoterPreviewGroup voters={voters} remainingLabel={remainingVoterCountLabel} />
      <VoteLegend segments={voteSegments} />
    </Card>
  )
}

export function FundingDistributionChart({
  totalAmount,
  projects,
  isStreaming = false,
  onProjectPress,
  testID,
}: FundingDistributionChartProps) {
  const theme = useTheme()
  const fallbackColors = ['#2563eb', '#16a34a', '#d97706', '#0891b2', '#dc2626']
  const colors = DONUT_COLOR_KEYS.map((key, index) => resolveThemeColor(theme, key, fallbackColors[index]))
  const total = { ...totalAmount, isStreaming: totalAmount.isStreaming ?? isStreaming }

  return (
    <Card data-testid={testID} width="100%" maxWidth={620} gap="$4">
      <YStack gap="$1">
        <Heading level={3}>Funding distribution</Heading>
        <Text tone="secondary">Current allocation across active governance projects.</Text>
      </YStack>
      <XStack flexWrap="wrap" justifyContent="center" alignItems="center" gap="$4">
        <FundingDonut projects={projects} totalAmount={total} colors={colors} onProjectPress={onProjectPress} />
        <FundingLegend projects={projects} colors={colors} onProjectPress={onProjectPress} />
      </XStack>
    </Card>
  )
}
