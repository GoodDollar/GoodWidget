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

// Longest fractional tail kept in the editable amount field. Matches
// formatTokenAmount's small-value precision so the input and the read-only
// fields agree on how much detail is worth showing.
const MAX_INPUT_DECIMALS = 6

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
 * Shortens a raw amount for display inside the editable amount input.
 *
 * MAX fills the field from the full-precision balance, which on an 18-decimal
 * token runs to 20+ characters ("79812.445063704882420442"). This caps the
 * fraction at six places for display only — the exact value stays in adapter
 * state and is what reaches parseUnits, so MAX still spends the whole balance.
 *
 * Truncates rather than rounds: the displayed value must never exceed the value
 * it came from, or a user who retypes what they see would ask to spend more than
 * they hold. No thousands separators either, because the field is editable and
 * the value has to stay something the user could have typed themselves.
 */
export function formatInputAmount(raw: string): string {
  const dot = raw.indexOf('.')
  if (dot === -1) return raw

  const truncated = raw.slice(0, dot + 1 + MAX_INPUT_DECIMALS)
  // "1.500000" → "1.5", "10.000000" → "10". The early return above keeps this
  // from eating the significant zeros in a whole number like "100".
  const trimmed = truncated.replace(/\.?0+$/, '')

  // A balance smaller than the display precision truncates away entirely; show
  // it in full rather than telling the user they hold nothing.
  if (trimmed === '' || Number(trimmed) === 0) return raw
  return trimmed
}

/**
 * Shrinks the hero amount font so a long raw value (a mid-edit entry, or a
 * sub-precision balance shown in full) stays inside the amount card instead of
 * overflowing it.
 */
export function amountFontSize(text: string, base: number): number {
  if (text.length <= 10) return base
  if (text.length <= 14) return Math.round(base * 0.75)
  if (text.length <= 20) return Math.round(base * 0.55)
  return Math.round(base * 0.42)
}
