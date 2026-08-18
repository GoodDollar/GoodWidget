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
/** AI credit / USD amounts use 6 decimals — small enough that a single Number() conversion is already safe. */
const USD_DECIMALS_DIVISOR = 1e6
const SECONDS_PER_DAY = 86400n

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
  const reduced = wei / 10n ** (GD_DECIMALS - 4n)
  return Number(reduced) / 10000
}

/**
 * AI credits / USD amounts are 6-decimal wei strings. Their realistic
 * magnitude is far below Number.MAX_SAFE_INTEGER even before scaling, so a
 * direct BigInt -> Number conversion is safe here (unlike weiToGd's 18
 * decimals above).
 */
export function weiToUsd(weiStr: string): number {
  if (!weiStr || weiStr === '0') return 0
  return Number(BigInt(weiStr)) / USD_DECIMALS_DIVISOR
}

/**
 * Converts a wei/second flow rate (18 decimals) to a G$/day figure. Scales
 * to a daily amount first while still in BigInt space (multiplying, not
 * dividing, so no precision is lost), then reuses weiToGd's reduction to
 * safely cross into Number range.
 */
export function flowRateToDaily(weiPerSecStr: string): number {
  if (!weiPerSecStr || weiPerSecStr === '0') return 0
  const weiPerSecond = BigInt(weiPerSecStr)
  const dailyWei = weiPerSecond * SECONDS_PER_DAY
  const reduced = dailyWei / 10n ** (GD_DECIMALS - 4n)
  return Number(reduced) / 10000
}
