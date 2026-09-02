/**
 * Shared money formatting for the AI Credits widget.
 *
 * Every G$ and US$ amount the widget renders goes through here, so the same
 * value never shows up in two different shapes across the Buy, Manage and
 * History cards.
 *
 * G$  — comma-grouped with up to 2 decimals and trailing zeros dropped
 *       (`10,000 G$`, `36,550.55 G$`); compact notation only from 1M up
 *       (`1.2M G$`) so whale balances cannot blow out a card.
 * US$ — always 2 decimals behind a single `US$` symbol (`US$1.30`); a positive
 *       amount that would round to zero renders as `<US$0.01`, so small
 *       credits never read as nothing.
 */

/** Above this, G$ amounts switch to compact notation to protect the layout. */
const G_COMPACT_FROM = 1_000_000

/** Smallest US$ amount that still rounds up to a visible cent. */
const USD_MIN_VISIBLE = 0.005

const gGrouped = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const gCompact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
})

const usdGrouped = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function toNumber(amount: string | number): number {
  if (typeof amount === 'number') return amount
  const parsed = Number.parseFloat(String(amount ?? '').replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function weiToNumber(amountWei: bigint | string): number {
  try {
    const wei = typeof amountWei === 'bigint' ? amountWei : BigInt(amountWei || '0')
    return Number(wei) / 1e18
  } catch {
    return 0
  }
}

/** Bare G$ number, for places where the label already carries the unit. */
export function formatGValue(amount: string | number): string {
  const value = toNumber(amount)
  if (!Number.isFinite(value) || value <= 0) return '0'
  if (value >= G_COMPACT_FROM) return gCompact.format(value)
  if (value < 0.01) return '<0.01'
  return gGrouped.format(value)
}

/** G$ number with its unit, e.g. `10,000 G$`. */
export function formatGAmount(amount: string | number): string {
  return `${formatGValue(amount)} G$`
}

/** True when {@link formatGValue} abbreviated the amount and an exact value is worth surfacing. */
export function isGValueCompacted(amount: string | number): boolean {
  const value = toNumber(amount)
  return Number.isFinite(value) && value >= G_COMPACT_FROM
}

/** Full G$ amount with no compacting, for tooltips behind a compacted value. */
export function formatExactGAmount(amount: string | number): string {
  const value = toNumber(amount)
  if (!Number.isFinite(value) || value <= 0) return '0 G$'
  return `${gGrouped.format(value)} G$`
}

export function formatGWeiValue(amountWei: bigint | string): string {
  return formatGValue(weiToNumber(amountWei))
}

export function formatGWeiAmount(amountWei: bigint | string): string {
  return formatGAmount(weiToNumber(amountWei))
}

/** Bare US$ number, for places where the label already carries the currency. */
export function formatUsdValue(amount: string | number): string {
  const value = toNumber(amount)
  if (!Number.isFinite(value) || value <= 0) return '0.00'
  if (value < USD_MIN_VISIBLE) return '<0.01'
  return usdGrouped.format(value)
}

export interface UsdAmountOptions {
  /** Currency symbol placed before the number. Defaults to `US$`. */
  symbol?: string
  /** Prefix positive amounts with `+`, for credit rows. */
  signed?: boolean
}

/** US$ amount with its symbol, e.g. `US$1.30`, `+US$1.30`, `<US$0.01`. */
export function formatUsdAmount(
  amount: string | number,
  { symbol = 'US$', signed = false }: UsdAmountOptions = {},
): string {
  const value = toNumber(amount)
  if (!Number.isFinite(value) || value <= 0) return `${symbol}0.00`
  if (value < USD_MIN_VISIBLE) return `<${symbol}0.01`
  return `${signed ? '+' : ''}${symbol}${usdGrouped.format(value)}`
}

/** Micro-USD (1e6) helpers — the unit the backend reports credit in. */
export function microToUsd(usdMicro: string | bigint): number {
  if (typeof usdMicro === 'bigint') return Number(usdMicro) / 1_000_000
  return toNumber(usdMicro) / 1_000_000
}

export function formatUsdMicroValue(usdMicro: string | bigint): string {
  return formatUsdValue(microToUsd(usdMicro))
}

export function formatUsdMicroAmount(
  usdMicro: string | bigint,
  options?: UsdAmountOptions,
): string {
  return formatUsdAmount(microToUsd(usdMicro), options)
}
