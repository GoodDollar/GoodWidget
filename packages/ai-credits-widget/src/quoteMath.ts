import { parseUnits } from 'viem'

export const CREDITS_PER_USD = 10_000
const REGULAR_BONUS_BPS = 1_000n
const STREAMING_BONUS_BPS = 2_000n
const BPS = 10_000n
const SECONDS_PER_MONTH = 30n * 24n * 60n * 60n

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

export function isGoodIdVerifiedFromProfile(account: string, rootAccount: string): boolean {
  return rootAccount.toLowerCase() !== account.toLowerCase()
}
