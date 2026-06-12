import React from 'react'
import { Stack } from 'tamagui'
import { Card, Heading, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import { ProposalHeader, RankedOptionRow, StackedProgressBar, VoteLegend, VoterPreviewGroup } from './primitives'
import type { AlignmentVotingProposalCardProps, OptimisticVotingProposalCardProps } from './types'
import { clampPercentage } from './utils'

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
