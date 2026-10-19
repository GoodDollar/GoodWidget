import React from 'react'
import { XStack, YStack } from 'tamagui'
import { Text } from './Text'
import { createComponent } from '../createComponent'

export interface ProgressBarProps {
  /** Current progress amount */
  value: number
  /** Total amount value is measured against */
  max: number
  label?: string
  /** 'success' drives the campaign-style green fill via the $success token */
  variant?: 'default' | 'success'
  /**
   * Hides the numeric percentage on narrow viewports, keeping only the label
   * and the visual bar. Off by default so existing consumers (governance-widget,
   * staking-migration-widget) are unaffected.
   */
  hidePercentageOnMobile?: boolean
}

const ProgressTrack = createComponent(YStack, {
  name: 'ProgressBarTrack',
  width: '100%',
  height: '$2',
  borderRadius: '$full',
  backgroundColor: '$backgroundHover',
  overflow: 'hidden',
})

const ProgressFill = createComponent(YStack, {
  name: 'ProgressBarFill',
  height: '100%',
  borderRadius: '$full',

  variants: {
    variant: {
      default: { backgroundColor: '$primary' },
      success: { backgroundColor: '$success' },
    },
  } as const,

  defaultVariants: {
    variant: 'default',
  },
})

export function ProgressBar({ value, max, label, variant = 'default', hidePercentageOnMobile = false }: ProgressBarProps) {
  // Guard against max <= 0 and clamp so callers can pass live/unbounded values safely
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  return (
    <YStack width="100%" gap="$1">
      {label && (
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">{label}</Text>
          <Text variant="caption" $sm={hidePercentageOnMobile ? { display: 'none' } : undefined}>
            {Math.round(percentage)}%
          </Text>
        </XStack>
      )}
      <ProgressTrack
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <ProgressFill variant={variant} width={`${percentage}%`} />
      </ProgressTrack>
    </YStack>
  )
}
