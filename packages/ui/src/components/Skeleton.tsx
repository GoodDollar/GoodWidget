/**
 * SkeletonBlock — a pulsing grey placeholder rectangle for loading states.
 * Generic across widgets (any dashboard with a slow initial fetch needs the
 * same "not frozen" placeholder), so it lives here in packages/ui rather
 * than in a specific widget package.
 */
import React, { useEffect, useState } from 'react'
import { YStack } from 'tamagui'
import { createComponent } from '../createComponent'

const PULSE_INTERVAL_MS = 700
const DIM_OPACITY = 0.5
const FULL_OPACITY = 1

/** Alternates between two opacity levels on a fixed interval, driving the pulse shared by every SkeletonBlock instance's own animated transition. */
function useSkeletonPulse(): number {
  const [opacity, setOpacity] = useState(FULL_OPACITY)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setOpacity((current) => (current === FULL_OPACITY ? DIM_OPACITY : FULL_OPACITY))
    }, PULSE_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [])

  return opacity
}

const SkeletonBlockFrame = createComponent(YStack, {
  name: 'SkeletonBlock',
  backgroundColor: '$borderColor',
  borderRadius: '$3',
  animation: 'medium',
})

export interface SkeletonBlockProps {
  width?: number | string
  height?: number | string
  borderRadius?: number | string
  testID?: string
}

export function SkeletonBlock({
  width = '100%',
  height,
  borderRadius,
  testID,
}: SkeletonBlockProps) {
  const opacity = useSkeletonPulse()
  return (
    <SkeletonBlockFrame
      width={width}
      height={height}
      borderRadius={borderRadius}
      opacity={opacity}
      testID={testID}
      data-testid={testID}
    />
  )
}
