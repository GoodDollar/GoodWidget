import React from 'react'
import { Text } from './Text'
import { XStack, YStack } from '../components-test/Stacks'
import { createComponent } from '../createComponent'

export interface ProgressBarProps {
  /** Current progress amount */
  value: number
  /** Total amount value is measured against */
  max: number
  label?: string
  /** 'success' drives the campaign-style green fill via the $success token */
  variant?: 'default' | 'success'
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

export function ProgressBar({ value, max, label, variant = 'default' }: ProgressBarProps) {
  // Guard against max <= 0 and clamp so callers can pass live/unbounded values safely
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  return (
    <YStack width="100%" gap="$1">
      {label && (
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">{label}</Text>
          <Text variant="caption">{Math.round(percentage)}%</Text>
        </XStack>
      )}
      <ProgressTrack>
        <ProgressFill variant={variant} width={`${percentage}%`} />
      </ProgressTrack>
    </YStack>
  )
}
