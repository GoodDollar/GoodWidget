import React from 'react'
import { Image } from 'react-native'
import Svg, { Circle, G } from 'react-native-svg'
import { Stack } from 'tamagui'
import { Badge, BadgeText, Button, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import type { FundingProjectAllocation, GovernanceAmount, ImpactCardMetric, RankedVotingOption, VoteSegment, VoterPreview } from './types'
import { clampPercentage, formatRawValue, renderGovernanceAmount, SEGMENT_TONES } from './utils'

export function MetricBox({ metric }: { metric: ImpactCardMetric }) {
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

export function ProposalHeader({ categoryLabel }: { categoryLabel: string }) {
  return (
    <XStack alignItems="center" justifyContent="space-between" gap="$3">
      <Badge type="info">
        <BadgeText>{categoryLabel}</BadgeText>
      </Badge>
      <Icon name="chevron-right" size="sm" color="muted" />
    </XStack>
  )
}

export function ProgressBar({ percentage, colorToken = '$primary' }: { percentage: number; colorToken?: string }) {
  return (
    <Stack height={8} borderRadius="$full" backgroundColor="$backgroundPress" overflow="hidden">
      <Stack width={`${clampPercentage(percentage)}%`} height="100%" backgroundColor={colorToken} />
    </Stack>
  )
}

export function RankedOptionRow({ option }: { option: RankedVotingOption }) {
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

export function StackedProgressBar({ segments }: { segments: VoteSegment[] }) {
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
        <Image
          accessibilityLabel={voter.label}
          resizeMode="cover"
          source={{ uri: voter.avatarUrl }}
          style={{ width: 32, height: 32 }}
        />
      ) : (
        <Text variant="caption" bold>
          {initial}
        </Text>
      )}
    </Stack>
  )
}

export function VoterPreviewGroup({ voters, remainingLabel }: { voters: VoterPreview[]; remainingLabel?: string }) {
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

export function VoteLegend({ segments }: { segments: VoteSegment[] }) {
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

export function FundingLegend({
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

export function FundingDonut({
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
