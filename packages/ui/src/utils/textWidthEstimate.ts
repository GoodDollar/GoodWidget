/**
 * Character-count-based text width estimate shared by every chart component
 * that needs to reason about label sizing before render (react-native-svg
 * has no DOM canvas to measure real glyph widths cross-platform). Previously
 * duplicated per-component; centralized here once ChartTooltip needed the
 * same estimate a third component wanted it.
 */
export function estimateTextWidthPx(text: string, fontSizePx: number): number {
  return text.length * fontSizePx * 0.6
}

/** Truncates a label with an ellipsis once it can't fit the available width at the given font size. */
export function truncateLabelToWidth(label: string, maxWidthPx: number, fontSizePx: number): string {
  const approxCharWidthPx = fontSizePx * 0.6
  const maxChars = Math.floor(maxWidthPx / approxCharWidthPx)

  if (maxChars <= 0) return ''
  if (label.length <= maxChars) return label
  if (maxChars === 1) return label.slice(0, 1)
  return `${label.slice(0, maxChars - 1)}…`
}
