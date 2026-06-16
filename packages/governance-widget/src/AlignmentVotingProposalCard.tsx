import { Card, Heading, Icon, Text, YStack, XStack } from '@goodwidget/ui'
import type { AlignmentVotingProposalCardProps, RankedVotingOption } from './types'
import { clampPercentage } from './format'
import { ProgressBar, ProposalHeader } from './shared'

function RankedOptionRow({ option }: { option: RankedVotingOption }) {
  return (
    <YStack gap="$2">
      <XStack alignItems="center" justifyContent="space-between" gap="$3">
        <Text variant="large" tone="soft" flex={1}>
          {option.label}
        </Text>
        <Text variant="large" color="$primary" bold noWrap>
          {clampPercentage(option.percentage)}%
        </Text>
      </XStack>
      <ProgressBar percentage={option.percentage} height={10} />
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
      borderColor="$primary"
      shadowColor="$elevationShadowColor"
      shadowOffset={{ width: 0, height: 8 }}
      shadowRadius={22}
      elevated
    >
      <ProposalHeader categoryLabel={categoryLabel} />
      <Heading level={4} color="$primary" lineHeight={54}>
        {title}
      </Heading>
      <XStack alignItems="center" gap="$2">
        <Icon name="info" size="xs" color="primary" />
        <Text variant="label" color="$primary">
          {summaryLabel}
        </Text>
      </XStack>
      <YStack gap="$4">
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
