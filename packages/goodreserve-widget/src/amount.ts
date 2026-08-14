// Keeps only digits and a single decimal point so the value is always safe to
// pass to viem's parseUnits (which throws on "1.2.3", "1e6", separators, etc.).
// Shared by the view (input onChange) and the adapter (setMaxAmount) so both
// entry points produce parseUnits-safe values.
export function sanitizeAmount(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}

// Smallest magnitude we render exactly; anything nonzero below this collapses to
// a "<0.000001" marker rather than displaying as a misleading "0.00".
const MIN_DISPLAY_VALUE = 0.000001

// Below this magnitude the fractional part carries real meaning (sub-unit token
// prices), above it the leading digits dominate and six decimals is just noise.
const HIGH_PRECISION_THRESHOLD = 1000

/**
 * Formats a token amount for display, magnitude-aware in the style of
 * Uniswap/Squid: small values keep up to 6 decimals, large values collapse to 2,
 * and everything gets thousands separators.
 *
 * Display only — never feed the result back into parseUnits. The raw
 * `formatUnits` string stays the source of truth for on-chain values
 * (`inputAmount`, `minReturnRaw`), because rounding it would change what the
 * user actually spends or accepts.
 *
 * Non-numeric input (an em-dash placeholder, an already-grouped fixture value)
 * passes through untouched so callers can hand it fallback strings safely.
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

/**
 * Shrinks the hero amount font so a long raw value (MAX fills the full-precision
 * balance, which can run to 20+ characters on an 18-decimal token) stays inside
 * the amount card instead of overflowing it.
 */
export function amountFontSize(text: string, base: number): number {
  if (text.length <= 10) return base
  if (text.length <= 14) return Math.round(base * 0.75)
  if (text.length <= 20) return Math.round(base * 0.55)
  return Math.round(base * 0.42)
}
