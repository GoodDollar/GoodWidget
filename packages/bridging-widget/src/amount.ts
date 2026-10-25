import { formatUnits } from 'viem'

// Amount-entry helpers for the Bridge tab's G$ input, following the pattern
// already established in goodreserve-widget/src/amount.ts. Not promoted to
// a shared package yet — per the execution plan, a generic version only
// gets extracted to packages/ui once a second widget needs it.

// Keeps only digits and a single decimal point so the value is always safe to
// pass to viem's parseUnits (which throws on "1.2.3", "1e6", separators, etc.).
export function sanitizeAmount(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}

// Smallest magnitude rendered exactly; anything nonzero below this collapses to
// a "<0.000001" marker rather than displaying as a misleading "0.00".
const MIN_DISPLAY_VALUE = 0.000001

// Above this magnitude the leading digits dominate and six decimals is just
// noise, so large G$ amounts collapse to two decimals.
const HIGH_PRECISION_THRESHOLD = 1000

// Longest fractional tail kept in the editable amount field while unfocused.
const MAX_INPUT_DECIMALS = 6

/**
 * Formats a G$/native-currency amount for display, magnitude-aware: small
 * values keep up to 6 decimals, large values collapse to 2, with thousands
 * separators throughout. Display only — never feed the result back into
 * parseUnits; the raw formatUnits string stays the source of truth.
 */
export function formatTokenAmount(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '0.00'
  if (typeof value === 'string' && value.trim() === '') return '0.00'

  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return String(value)
  if (num === 0) return '0.00'

  const abs = Math.abs(num)
  if (abs < MIN_DISPLAY_VALUE) return num < 0 ? '>-0.000001' : '<0.000001'

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: abs < HIGH_PRECISION_THRESHOLD ? 6 : 2,
  }).format(num)
}

// SDK history events expose normalizedAmount at 18 decimals, regardless of
// the source token's decimals (Fuse G$ uses 2 decimals before bridging).
export function formatHistoryAmount(normalizedAmount: bigint): string {
  return formatTokenAmount(formatUnits(normalizedAmount, 18))
}

/**
 * Shortens a raw amount for display inside the editable amount input while
 * unfocused. Truncates rather than rounds so the displayed value never
 * exceeds the value it came from (a MAX fill must still spend the full
 * balance even though only 6 decimals are shown).
 */
export function formatInputAmount(raw: string): string {
  const dot = raw.indexOf('.')
  if (dot === -1) return raw

  const truncated = raw.slice(0, dot + 1 + MAX_INPUT_DECIMALS)
  const trimmed = truncated.replace(/\.?0+$/, '')

  if (trimmed === '' || Number(trimmed) === 0) return raw
  return trimmed
}
