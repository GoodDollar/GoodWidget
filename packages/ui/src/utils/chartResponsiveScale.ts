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

/**
 * Same character-count width estimate BarChart/LineAreaChart already use for
 * their axis labels (`estimateTextWidthPx`/`truncateLabelToWidth`) — no
 * canvas `measureText` here, since these charts render through
 * react-native-svg and need to work without a DOM canvas.
 */
const APPROX_CHAR_WIDTH_RATIO = 0.6

/**
 * `computeChartScaleRatio` scales a chart's title font size up for wide
 * embeds, but only clamps against a fixed ratio ceiling — it has no way to
 * know how long a given title string is, so a long title at a large scale
 * ratio can render wider than the chart itself. This shrinks (never grows)
 * `candidateFontSizePx` until the title's estimated width fits within
 * `maxWidthPx`, floored at `minFontSizePx` so it never becomes illegible.
 */
export function computeShrinkToFitFontSizePx(
  text: string,
  candidateFontSizePx: number,
  maxWidthPx: number,
  minFontSizePx: number,
): number {
  if (text.length === 0 || maxWidthPx <= 0) return candidateFontSizePx

  const estimatedWidthPx = text.length * candidateFontSizePx * APPROX_CHAR_WIDTH_RATIO
  if (estimatedWidthPx <= maxWidthPx) return candidateFontSizePx

  const fittedFontSizePx = maxWidthPx / (text.length * APPROX_CHAR_WIDTH_RATIO)
  return Math.max(minFontSizePx, fittedFontSizePx)
}
