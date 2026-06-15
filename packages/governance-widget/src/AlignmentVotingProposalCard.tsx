import { Card, Heading, Icon, Text, YStack, XStack } from '@goodwidget/ui'
import type { AlignmentVotingProposalCardProps, RankedVotingOption } from './types'
import { clampPercentage } from './format'
import { ProgressBar, ProposalHeader } from './shared'

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
