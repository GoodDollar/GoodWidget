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
  // Rounded up: canvas measureText and the real DOM text-layout width for the
  // same string/font can differ by a fraction of a pixel (confirmed via direct
  // comparison). Every caller treats "estimate <= available width" as "fits
  // without truncating/wrapping" — an estimate that's a hair narrower than the
  // real render clips text that should have fit. Ceiling makes the estimate
  // never smaller than the real width, at the cost of at most ~1px of
  // imperceptible extra reserved space.
  if (context) {
    context.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`
    return Math.ceil(context.measureText(text).width)
  }

  return Math.ceil(text.length * fontSizePx * 0.6)
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

/**
 * Wraps a label to at most two lines at a word boundary, for cases (like
 * rotated axis titles) where a taller/wider container gives room for a
 * second line instead of truncating immediately. Only falls back to an
 * ellipsis on the second line if the label still doesn't fit after wrapping.
 */
export function wrapLabelToTwoLines(
  label: string,
  maxWidthPx: number,
  fontSizePx: number,
  fontFamily: string = DEFAULT_FONT_FAMILY,
  fontWeight: string = 'normal',
): [string] | [string, string] {
  if (maxWidthPx <= 0 || estimateTextWidthPx(label, fontSizePx, fontFamily, fontWeight) <= maxWidthPx) {
    return [label]
  }

  const words = label.split(' ')
  let firstLine = ''
  let wordIndex = 0
  for (; wordIndex < words.length; wordIndex += 1) {
    const candidate = firstLine ? `${firstLine} ${words[wordIndex]}` : words[wordIndex]
    if (estimateTextWidthPx(candidate, fontSizePx, fontFamily, fontWeight) <= maxWidthPx) {
      firstLine = candidate
    } else {
      break
    }
  }

  // No usable word boundary (even the first word overflows) — nothing to gain from a
  // second line, so fall through to the single-line ellipsis fallback instead.
  if (!firstLine) {
    return [truncateLabelToWidth(label, maxWidthPx, fontSizePx, fontFamily, fontWeight)]
  }

  const remaining = words.slice(wordIndex).join(' ')
  if (!remaining) return [firstLine]

  const secondLine =
    estimateTextWidthPx(remaining, fontSizePx, fontFamily, fontWeight) <= maxWidthPx
      ? remaining
      : truncateLabelToWidth(remaining, maxWidthPx, fontSizePx, fontFamily, fontWeight)

  return [firstLine, secondLine]
}
