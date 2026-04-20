import React from 'react'
import { Stack } from 'tamagui'
import { createComponent } from '../createComponent'

const SpinnerDot = createComponent(Stack, {
  name: 'Spinner',
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '$color',

  variants: {
    size: {
      sm: { width: 6, height: 6, borderRadius: 3 },
      md: { width: 8, height: 8, borderRadius: 4 },
      lg: { width: 12, height: 12, borderRadius: 6 },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
})

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

export function Spinner({ size = 'md', color }: SpinnerProps) {
  return (
    <Stack flexDirection="row" gap="$1" alignItems="center" justifyContent="center">
      <SpinnerDot size={size} opacity={0.3} {...(color ? { backgroundColor: color } : {})} />
      <SpinnerDot size={size} opacity={0.6} {...(color ? { backgroundColor: color } : {})} />
      <SpinnerDot size={size} opacity={1} {...(color ? { backgroundColor: color } : {})} />
    </Stack>
  )
}
