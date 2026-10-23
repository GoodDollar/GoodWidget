/**
 * analyticsConversions — BigInt-safe unit conversions for AntSeed analytics
 * values. The Worker API returns wei-denominated amounts as decimal strings
 * (not numbers) specifically because they can exceed Number.MAX_SAFE_INTEGER;
 * every conversion here must stay in BigInt arithmetic for as long as
 * possible and only drop to Number after the value has already been reduced
 * to a small, safe magnitude.
 */

/** G$ uses 18 decimals. Dividing by 10^18 directly (or via Number(BigInt)) risks precision loss for large totals. */
const GD_DECIMALS = 18n
/** AI credit / USD amounts use 6 decimals. */
const USD_DECIMALS = 6n
/** How many of the source's decimal digits survive into the final Number — both conversions below keep 4. */
const OUTPUT_PRECISION_DECIMALS = 4n
/** Average seconds per month (365.2425-day Gregorian year / 12), not a fixed 30-day month — plain multiplication, not exponentiation. */
const SECONDS_PER_MONTH = 2629746n

/**
 * Reduces an 18-decimal wei BigInt down to a 4-decimal-precision BigInt
 * (dividing by 10^14) before converting to Number, then divides by 10^4 to
 * land on a plain G$ float. Doing the bulk of the scale-down in BigInt space
 * (10^14 of the 10^18 decimals) keeps the final Number() conversion within
 * safe integer range even for very large deposit/stream totals — going
 * straight from a full 18-decimal BigInt to Number would silently lose
 * precision or overflow for realistic on-chain amounts.
 */
export function weiToGd(weiStr: string): number {
  if (!weiStr || weiStr === '0') return 0
  const wei = BigInt(weiStr)
  const reduced = wei / 10n ** (GD_DECIMALS - OUTPUT_PRECISION_DECIMALS)
  return Number(reduced) / 10000
}

/**
 * AI credits / USD amounts are 6-decimal wei strings. Reduces to 4-decimal
 * precision in BigInt space first — mirroring weiToGd — before crossing into
 * Number, rather than converting the full BigInt directly. A direct
 * Number(BigInt(weiStr)) conversion silently loses precision once the value
 * exceeds Number.MAX_SAFE_INTEGER, which a sufficiently large aggregate USD
 * total could reach even at only 6 decimals.
 */
export function weiToUsd(weiStr: string): number {
  if (!weiStr || weiStr === '0') return 0
  const wei = BigInt(weiStr)
  const reduced = wei / 10n ** (USD_DECIMALS - OUTPUT_PRECISION_DECIMALS)
  return Number(reduced) / 10000
}

/**
 * Converts a wei/second flow rate (18 decimals) to a G$/month figure. Scales
 * to a monthly amount first while still in BigInt space (multiplying, not
 * dividing, so no precision is lost), then reuses weiToGd's reduction to
 * safely cross into Number range.
 */
export function flowRateToMonthly(weiPerSecStr: string): number {
  if (!weiPerSecStr || weiPerSecStr === '0') return 0
  const weiPerSecond = BigInt(weiPerSecStr)
  const monthlyWei = weiPerSecond * SECONDS_PER_MONTH
  const reduced = monthlyWei / 10n ** (GD_DECIMALS - OUTPUT_PRECISION_DECIMALS)
  return Number(reduced) / 10000
}
