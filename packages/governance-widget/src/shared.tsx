import { Stack } from 'tamagui'
import { Heading, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import type { GovernanceAmount, VoteSegment } from './types'
import { clampPercentage, formatCompactValue, formatRawValue } from './format'

export const SEGMENT_TONES: Record<NonNullable<VoteSegment['tone']>, string> = {
  for: '$primary',
  against: '$error',
  abstain: '$placeholderColor',
  neutral: '$success',
}

export type GovernanceAmountSize = 'sm' | 'md' | 'lg' | 'xl'

const VALUE_TEXT_SIZE: Record<GovernanceAmountSize, number> = {
  sm: 18,
  md: 24,
  lg: 36,
  xl: 52,
}

const TOKEN_TEXT_SIZE: Record<GovernanceAmountSize, number> = {
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
}

const CAPTION_SIZE: Record<GovernanceAmountSize, 'caption' | 'label'> = {
  sm: 'caption',
  md: 'caption',
  lg: 'label',
  xl: 'label',
}

export function renderGovernanceAmount(amount: GovernanceAmount, size: GovernanceAmountSize = 'lg') {
  return (
    <YStack gap="$1">
      {amount.token ? (
        <XStack alignItems="baseline" gap="$1">
          <Text fontSize={TOKEN_TEXT_SIZE[size]} lineHeight={TOKEN_TEXT_SIZE[size]} fontWeight="700">
            {amount.token}
          </Text>
          <Text fontSize={VALUE_TEXT_SIZE[size]} lineHeight={VALUE_TEXT_SIZE[size]} fontWeight="700">
            {formatCompactValue(amount.value)}
          </Text>
        </XStack>
      ) : (
        <Heading level={size === 'xl' ? 2 : 4}>{formatRawValue(amount.value)}</Heading>
      )}
      {amount.isStreaming ? (
        <Text variant={CAPTION_SIZE[size]} tone="secondary">
          {amount.streamLabel ?? 'Live stream'}
        </Text>
      ) : null}
    </YStack>
  )
}

export function ProposalHeader({ categoryLabel }: { categoryLabel: string }) {
  return (
    <XStack alignItems="center" justifyContent="space-between" gap="$3">
      <XStack
        alignItems="center"
        borderRadius="$full"
        backgroundColor="rgba(0, 176, 255, 0.10)"
        borderWidth={1}
        borderColor="rgba(0, 176, 255, 0.12)"
        paddingHorizontal="$3"
        paddingVertical="$2"
      >
        <Text variant="label" color="$primary" fontWeight="700">
          {categoryLabel}
        </Text>
      </XStack>
      <Icon name="chevron-right" size="sm" color="muted" />
    </XStack>
  )
}

export function resolveThemeColor(
  theme: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const themeValue = theme[key]

  if (themeValue && typeof themeValue === 'object' && 'val' in themeValue) {
    return String((themeValue as { val: unknown }).val)
  }

  return fallback
}

export function ProgressBar({
  percentage,
  colorToken = '$primary',
  height = 8,
}: {
  percentage: number
  colorToken?: string
  height?: number
}) {
  return (
    <Stack height={height} borderRadius="$full" backgroundColor="$borderColor" overflow="hidden">
      <Stack width={`${clampPercentage(percentage)}%`} height="100%" backgroundColor={colorToken} />
    </Stack>
  )
}
