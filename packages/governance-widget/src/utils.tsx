import React from 'react'
import { Heading, Text, TokenAmount, YStack } from '@goodwidget/ui'
import type { useTheme } from 'tamagui'
import type { GovernanceAmount } from './types'

export const SEGMENT_TONES = {
  for: '$primary',
  against: '$error',
  abstain: '$placeholderColor',
  neutral: '$success',
} as const

export const DONUT_COLOR_KEYS = ['primary', 'success', 'warning', 'info', 'error'] as const

export function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(100, value))
}

export function formatRawValue(value: string | number): string {
  if (typeof value === 'string') {
    return value
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

export function isGovernanceAmount(value: GovernanceAmount | string | number): value is GovernanceAmount {
  return typeof value === 'object' && value !== null && 'value' in value
}

export function resolveThemeColor(theme: ReturnType<typeof useTheme>, key: string, fallback: string): string {
  const themeValue = theme[key as keyof typeof theme]

  if (themeValue && typeof themeValue === 'object' && 'val' in themeValue) {
    return String(themeValue.val)
  }

  return fallback
}

export function renderGovernanceAmount(amount: GovernanceAmount, size: 'sm' | 'md' | 'lg' | 'xl' = 'lg') {
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
