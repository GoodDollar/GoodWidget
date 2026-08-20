/**
 * Scales chart layout constants (padding, font sizes) against a chart's real
 * rendered width instead of leaving them fixed at pixel values tuned for one
 * reference size. Every analytics chart's constants were designed to look
 * right at `referenceWidthPx` (400px); this maps a wider/narrower container
 * to a clamped ratio so a 4K embed doesn't inherit hairline padding/text
 * sized for a phone-width widget, and a narrow widget doesn't inherit
 * desktop-sized padding that would eat most of its plot area.
 */
const MIN_SCALE_RATIO = 0.6
const MAX_SCALE_RATIO = 2

export function computeChartScaleRatio(containerWidthPx: number, referenceWidthPx: number): number {
  const rawRatio = containerWidthPx / referenceWidthPx
  return Math.min(MAX_SCALE_RATIO, Math.max(MIN_SCALE_RATIO, rawRatio))
}

export function scalePx(basePx: number, scaleRatio: number): number {
  return basePx * scaleRatio
}

interface EdgeInsets {
  top: number
  right: number
  bottom: number
  left: number
}

/** Scales a padding/inset object's four edges by the same ratio. */
export function scaleEdgeInsets<T extends EdgeInsets>(insets: T, scaleRatio: number): T {
  return {
    ...insets,
    top: scalePx(insets.top, scaleRatio),
    right: scalePx(insets.right, scaleRatio),
    bottom: scalePx(insets.bottom, scaleRatio),
    left: scalePx(insets.left, scaleRatio),
  }
}
