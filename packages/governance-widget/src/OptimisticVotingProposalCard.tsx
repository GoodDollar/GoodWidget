import { Stack } from 'tamagui'
import { Card, Heading, Text, XStack } from '@goodwidget/ui'
import type { OptimisticVotingProposalCardProps, VoteSegment } from './types'
import { clampPercentage } from './format'
import { ProposalHeader, SEGMENT_TONES } from './shared'
import { VoterAvatarStack } from './VoterAvatarStack'

function StackedProgressBar({ segments }: { segments: VoteSegment[] }) {
  return (
    <XStack height={12} borderRadius="$full" backgroundColor="$borderColor" overflow="hidden">
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

function VoteLegend({ segments }: { segments: VoteSegment[] }) {
  return (
    <XStack flexWrap="wrap" gap="$3">
      {segments.map((segment) => (
        <XStack key={segment.id} alignItems="center" gap="$2">
          <Stack
            width={8}
            height={8}
            borderRadius="$full"
            backgroundColor={SEGMENT_TONES[segment.tone ?? 'neutral']}
          />
          <Text variant="caption" tone="secondary">
            {segment.label} ({clampPercentage(segment.percentage)}%)
          </Text>
        </XStack>
      ))}
    </XStack>
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
  statusLabel,
  statusTone = 'warning',
  onPress,
  testID,
}: OptimisticVotingProposalCardProps) {
  const statusColor =
    statusTone === 'positive' ? '$success' : statusTone === 'muted' ? '$placeholderColor' : '$warning'

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
      shadowColor="$elevationShadowColor"
      shadowOffset={{ width: 0, height: 8 }}
      shadowRadius={22}
      elevated
    >
      <ProposalHeader categoryLabel={categoryLabel} />
      <Heading level={4} lineHeight={54}>{title}</Heading>
      <Stack gap="$2">
        <XStack alignItems="center" justifyContent="space-between" gap="$3">
          <Text variant="caption" tone="secondary">
            {quorumLabel}
          </Text>
          <Text variant="label" bold noWrap>
            {clampPercentage(quorumReachedPercent)}% reached
          </Text>
        </XStack>
        <Stack position="relative">
          <Stack height={12} borderRadius="$full" backgroundColor="$borderColor" overflow="hidden">
            <Stack width={`${clampPercentage(quorumReachedPercent)}%`} height="100%" backgroundColor="$backgroundHover" />
          </Stack>
          <Stack position="absolute" left={0} right={0} top={0} bottom={0}>
            <StackedProgressBar segments={voteSegments} />
          </Stack>
        </Stack>
      </Stack>
      <Stack height={1} backgroundColor="$borderColor" />
      <XStack alignItems="center" justifyContent="space-between" gap="$3" flexWrap="wrap">
        <VoterAvatarStack voters={voters} remainingLabel={remainingVoterCountLabel} />
        {statusLabel ? (
          <Text variant="caption" color={statusColor} fontWeight="600">
            {statusLabel}
          </Text>
        ) : null}
      </XStack>
      <VoteLegend segments={voteSegments} />
    </Card>
  )
}
