import { useCallback, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'

/**
 * Measures a container's real rendered height via `onLayout`, mirroring
 * `useMeasuredWidth`. Unlike width, this must be attached to the shrink-wrapping
 * plot-area element rather than the outer frame: once that element is given
 * `flexGrow: 1` by its ancestors, its resolved layout height genuinely reflects
 * how much vertical room the container offered, so measuring it isn't circular
 * the way measuring the SVG's own box would be. `fallbackHeightPx` is only used
 * for the single frame before the first layout event arrives.
 */
export function useMeasuredHeight(fallbackHeightPx: number): {
  measuredHeightPx: number
  onLayout: (event: LayoutChangeEvent) => void
} {
  const [measuredHeightPx, setMeasuredHeightPx] = useState(fallbackHeightPx)

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeightPx = event.nativeEvent.layout.height
    if (nextHeightPx > 0) setMeasuredHeightPx(nextHeightPx)
  }, [])

  return { measuredHeightPx, onLayout }
}
