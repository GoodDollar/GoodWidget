/**
 * resolveThemeColor — shared theme-token-to-raw-color resolver for analytics
 * chart components. react-native-svg's fill/stroke props aren't part of
 * Tamagui's styling system, so SVG-drawn chart elements (arcs, bars, lines,
 * grid) need the resolved color value rather than a "$token" reference.
 *
 * Extracted from Scorecard.tsx's private implementation once a second
 * consumer (PieDonutChart) needed the same logic, mirroring how
 * formatMetricValue was already shared rather than duplicated.
 */
import type { useTheme } from 'tamagui'

/**
 * Falls back to the theme's base `$color` token if the requested token is
 * missing, so a bad token renders in a visible (if wrong) color instead of
 * silently disappearing as black-on-web / transparent-on-native.
 */
export function resolveThemeColor(theme: ReturnType<typeof useTheme>, token: string): string {
  const themeRecord = theme as unknown as Record<string, { val?: unknown } | string | undefined>
  const key = token.replace('$', '')
  const themeValue = themeRecord[key]
  const resolved =
    themeValue && typeof themeValue === 'object' && 'val' in themeValue
      ? String(themeValue.val)
      : typeof themeValue === 'string'
        ? themeValue
        : undefined

  if (resolved) {
    return resolved
  }

  console.warn(`resolveThemeColor: theme token "${token}" not found, falling back to "$color"`)

  const fallback = themeRecord.color
  return fallback && typeof fallback === 'object' && 'val' in fallback ? String(fallback.val) : '#000000'
}
