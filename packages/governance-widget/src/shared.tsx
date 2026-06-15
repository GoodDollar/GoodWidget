import { Stack } from 'tamagui'
import { Badge, BadgeText, Heading, Icon, Text, TokenAmount, XStack, YStack } from '@goodwidget/ui'
import type { GovernanceAmount, VoteSegment } from './types'
import { clampPercentage, formatRawValue } from './format'

export const SEGMENT_TONES: Record<NonNullable<VoteSegment['tone']>, string> = {
  for: '$primary',
  against: '$error',
  abstain: '$placeholderColor',
  neutral: '$success',
}

export type GovernanceAmountSize = 'sm' | 'md' | 'lg' | 'xl'

export function renderGovernanceAmount(amount: GovernanceAmount, size: GovernanceAmountSize = 'lg') {
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
    <Stack height={8} borderRadius="$full" backgroundColor="$borderColor" overflow="hidden">
      <Stack width={`${clampPercentage(percentage)}%`} height="100%" backgroundColor={colorToken} />
    </Stack>
  )
}
