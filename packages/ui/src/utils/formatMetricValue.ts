/**
 * formatMetricValue — shared numeric formatter for analytics chart components
 * (Scorecard is the first of 5 planned; all need the same compact K/M/B/T rules).
 */

export type MetricFormat = 'compact' | 'decimal' | 'none'

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
  const match = COMPACT_THRESHOLDS.find(({ threshold }) => absValue >= threshold)

  if (!match) {
    return value.toFixed(decimals)
  }

  return `${(value / match.threshold).toFixed(decimals)}${match.suffix}`
}

function formatDecimal(value: number, decimals: number): string {
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
  if (format === 'none') {
    return String(value)
  }

  const resolvedDecimals = decimals ?? (format === 'compact' ? 1 : 2)
  assertNonNegativeInteger(resolvedDecimals)

  return format === 'compact' ? formatCompact(value, resolvedDecimals) : formatDecimal(value, resolvedDecimals)
}
