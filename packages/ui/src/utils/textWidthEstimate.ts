/**
 * Text width estimate shared by every chart component that needs to reason
 * about label sizing before render. On web, measures real glyph widths on a
 * shared offscreen canvas — this tracks whatever font actually renders
 * (including browser font-fallback) instead of assuming a fixed width per
 * character. React Native has no canvas/DOM to measure against, so it falls
 * back to a character-count heuristic there.
 */
const DEFAULT_FONT_FAMILY = 'Avenir Next, Inter, system-ui, -apple-system, sans-serif'

let measureTextContext: CanvasRenderingContext2D | null | undefined

function getMeasureTextContext(): CanvasRenderingContext2D | null {
  if (measureTextContext === undefined) {
    measureTextContext = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  }
  return measureTextContext
}

export function estimateTextWidthPx(
  text: string,
  fontSizePx: number,
  fontFamily: string = DEFAULT_FONT_FAMILY,
  fontWeight: string = 'normal',
): number {
  const context = getMeasureTextContext()
  if (context) {
    context.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`
    return context.measureText(text).width
  }

  return text.length * fontSizePx * 0.6
}

/** Truncates a label with an ellipsis once it can't fit the available width at the given font size. */
export function truncateLabelToWidth(
  label: string,
  maxWidthPx: number,
  fontSizePx: number,
  fontFamily: string = DEFAULT_FONT_FAMILY,
  fontWeight: string = 'normal',
): string {
  if (maxWidthPx <= 0) return ''
  if (estimateTextWidthPx(label, fontSizePx, fontFamily, fontWeight) <= maxWidthPx) return label

  // Shrink one character at a time and re-measure the actual candidate string
  // (ellipsis included) against the same estimator used above, so truncation
  // can never disagree with the fits-or-not decision that triggered it.
  for (let chars = label.length - 1; chars > 0; chars -= 1) {
    const candidate = `${label.slice(0, chars)}…`
    if (estimateTextWidthPx(candidate, fontSizePx, fontFamily, fontWeight) <= maxWidthPx) {
      return candidate
    }
  }

  return label.slice(0, 1)
}
