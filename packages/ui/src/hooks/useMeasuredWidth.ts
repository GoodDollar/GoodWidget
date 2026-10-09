import { useCallback, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'

/**
 * Measures a container's real rendered width via `onLayout`, which fires
 * consistently on both native React Native and the react-native-web shim
 * (Storybook/web), unlike `ResizeObserver` which only exists on web. Charts
 * need this because a `width` prop can arrive as a CSS string (e.g. "100%")
 * that resolves visually to the real box size, but SVG viewBox math needs a
 * plain number. `fallbackWidthPx` is only used for the single frame before
 * the first layout event arrives.
 */
export function useMeasuredWidth(fallbackWidthPx: number): {
  measuredWidthPx: number
  onLayout: (event: LayoutChangeEvent) => void
} {
  const [measuredWidthPx, setMeasuredWidthPx] = useState(fallbackWidthPx)

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidthPx = event.nativeEvent.layout.width
    if (nextWidthPx > 0) setMeasuredWidthPx(nextWidthPx)
  }, [])

  return { measuredWidthPx, onLayout }
}
