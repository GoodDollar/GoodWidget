/**
 * formatMetricValue — shared numeric formatter for analytics chart components
 * (Scorecard is the first of 5 planned; all need the same compact K/M/B/T rules).
 */

export type MetricFormat = 'compact' | 'decimal' | 'none'

/** Non-finite values (NaN, Infinity) have no sensible numeric rendering. */
const NON_FINITE_FALLBACK = '--'

/** Ordered largest-first so the first matching threshold wins. */
const COMPACT_THRESHOLDS = [
  { threshold: 1_000_000_000_000, suffix: 'T' },
  { threshold: 1_000_000_000, suffix: 'B' },
  { threshold: 1_000_000, suffix: 'M' },
  { threshold: 1_000, suffix: 'K' },
] as const

function assertNonNegativeInteger(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error(`formatMetricValue: "decimals" must be a non-negative integer, received ${decimals}`)
  }
}

function formatCompact(value: number, decimals: number): string {
  const absValue = Math.abs(value)
  let thresholdIndex = COMPACT_THRESHOLDS.findIndex(({ threshold }) => absValue >= threshold)

  if (thresholdIndex === -1) {
    // Below the smallest compact threshold: whole-number metrics (wallet
    // counts, day counts, etc.) render without decimal places regardless of
    // the requested precision — "47", not "47.0".
    return Number.isInteger(value) ? String(value) : value.toFixed(decimals)
  }

  // Rounding the scaled value can carry it up to the next unit (e.g. 999_950 → "1000.0K"
  // instead of "1.0M"). Walk up to the next larger threshold (lower index) until the
  // rounded value fits under 1000, or there's no larger unit left.
  while (thresholdIndex > 0) {
    const scaled = Number((value / COMPACT_THRESHOLDS[thresholdIndex].threshold).toFixed(decimals))

    if (Math.abs(scaled) < 1000) {
      break
    }

    thresholdIndex -= 1
  }

  const { threshold, suffix } = COMPACT_THRESHOLDS[thresholdIndex]

  return `${(value / threshold).toFixed(decimals)}${suffix}`
}

function formatDecimal(value: number, decimals: number): string {
  // Intentionally hardcoded to en-US for v1; take a locale param once i18n is in scope.
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  }).format(value)
}

/**
 * Formats a raw metric value per the K/M/B/T "compact" scale, a full
 * comma-grouped "decimal" form, or a "none" passthrough.
 *
 * `decimals` defaults to 1 for "compact" and 2 for "decimal" (per #139's spec)
 * and must be a non-negative integer — invalid input is a developer error,
 * not a runtime state, so it throws rather than silently clamping.
 */
export function formatMetricValue(value: number, format: MetricFormat = 'compact', decimals?: number): string {
  if (!Number.isFinite(value)) {
    return NON_FINITE_FALLBACK
  }

  if (format === 'none') {
    return String(value)
  }

  const resolvedDecimals = decimals ?? (format === 'compact' ? 1 : 2)
  assertNonNegativeInteger(resolvedDecimals)

  return format === 'compact' ? formatCompact(value, resolvedDecimals) : formatDecimal(value, resolvedDecimals)
}
