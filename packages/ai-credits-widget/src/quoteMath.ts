import { parseUnits } from 'viem'

export const CREDITS_PER_USD = 10_000
const REGULAR_BONUS_BPS = 1_000n
const STREAMING_BONUS_BPS = 2_000n
const BPS = 10_000n
const SECONDS_PER_MONTH = 30n * 24n * 60n * 60n
const USD_18_TO_MICRO = 1_000_000_000_000n

export function parseGAmount(amount: string): number {
  const normalized = amount.trim().replace(/,/g, '')
  if (!normalized) return 0
  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) ? value : 0
}

export function gToWei(amountG: string): bigint {
  const trimmed = amountG.trim()
  if (!trimmed || Number.parseFloat(trimmed) <= 0) return 0n
  return parseUnits(trimmed, 18)
}

export function weiToG(amountWei: bigint): string {
  const value = Number(amountWei) / 1e18
  return value.toFixed(2)
}

export function gdWeiToUsd(gdAmountWei: bigint, gdUsdPerToken: number): bigint {
  const usdPerToken = BigInt(Math.round(gdUsdPerToken * 1e6))
  return (gdAmountWei * usdPerToken) / 1_000_000_000_000_000_000n
}

export function formatProfileUsd(usd: bigint): string {
  return (Number(usd) / 1_000_000).toFixed(4)
}

export function formatUsdMicro(usdMicro: string): string {
  return (Number(usdMicro || '0') / 1_000_000).toFixed(4)
}

export function usdDisplayToMicro(usdDisplay: string): string {
  const value = Number.parseFloat(usdDisplay)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Enter a valid USD amount')
  }
  return Math.round(value * 1_000_000).toString()
}

export function usdToCredits(usd: string): string {
  const value = BigInt(usd || '0')
  const credits = Number(value) / CREDITS_PER_USD
  return credits.toFixed(2)
}

export function flowRateWeiToMonthlyG(flowRateWeiPerSecond: string): string {
  const rate = BigInt(flowRateWeiPerSecond || '0')
  if (rate <= 0n) return '0.00'
  return weiToG(rate * SECONDS_PER_MONTH)
}

export function vaultUsd18ToMicro(usd18: bigint): bigint {
  return usd18 / USD_18_TO_MICRO
}

export function buildQuoteFromPrincipalUsd(
  depositG: string,
  streamG: string,
  depositPrincipalUsd: bigint,
  streamPrincipalUsd: bigint,
  isGoodIdVerified: boolean,
): {
  depositAmountG: string
  streamAmountG: string
  depositAmountUsd: string
  streamAmountUsd: string
  bonusPercent: number
  totalCredits: string
} {
  const streamWei = gToWei(streamG)
  const depositBonusUsd = isGoodIdVerified
    ? (depositPrincipalUsd * REGULAR_BONUS_BPS) / BPS
    : 0n
  const streamBonusUsd = isGoodIdVerified
    ? (streamPrincipalUsd * STREAMING_BONUS_BPS) / BPS
    : 0n
  const totalUsd =
    depositPrincipalUsd + depositBonusUsd + streamPrincipalUsd + streamBonusUsd
  const hasStream = streamWei > 0n
  const bonusPercent = !isGoodIdVerified ? 0 : hasStream ? 20 : 10

  return {
    depositAmountG: depositG,
    streamAmountG: streamG,
    depositAmountUsd: formatProfileUsd(depositPrincipalUsd),
    streamAmountUsd: formatProfileUsd(streamPrincipalUsd),
    bonusPercent,
    totalCredits: usdToCredits(totalUsd.toString()),
  }
}

export function buildQuoteFromGdAmounts(
  depositG: string,
  streamG: string,
  gdUsdPerToken: number,
  isGoodIdVerified: boolean,
): {
  depositAmountG: string
  streamAmountG: string
  depositAmountUsd: string
  streamAmountUsd: string
  bonusPercent: number
  totalCredits: string
} {
  const depositWei = gToWei(depositG)
  const streamWei = gToWei(streamG)
  const depositPrincipalUsd = gdWeiToUsd(depositWei, gdUsdPerToken)
  const streamPrincipalUsd = gdWeiToUsd(streamWei, gdUsdPerToken)
  const depositBonusUsd = isGoodIdVerified
    ? (depositPrincipalUsd * REGULAR_BONUS_BPS) / BPS
    : 0n
  const streamBonusUsd = isGoodIdVerified
    ? (streamPrincipalUsd * STREAMING_BONUS_BPS) / BPS
    : 0n
  const totalUsd =
    depositPrincipalUsd + depositBonusUsd + streamPrincipalUsd + streamBonusUsd
  const hasStream = streamWei > 0n
  const bonusPercent = !isGoodIdVerified ? 0 : hasStream ? 20 : 10

  return {
    depositAmountG: depositG,
    streamAmountG: streamG,
    depositAmountUsd: formatProfileUsd(depositPrincipalUsd),
    streamAmountUsd: formatProfileUsd(streamPrincipalUsd),
    bonusPercent,
    totalCredits: usdToCredits(totalUsd.toString()),
  }
}
