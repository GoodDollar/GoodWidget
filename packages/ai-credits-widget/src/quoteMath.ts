import { parseUnits } from 'viem'
import type { AiCreditsQuote } from './widgetRuntimeContract'

export const CREDITS_PER_USD = 10_000
export const DEPOSIT_BONUS_PERCENT = 10
export const STREAM_BONUS_PERCENT = 20
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

export function getDepositBonusPercent(isGoodIdVerified: boolean): number {
  return isGoodIdVerified ? DEPOSIT_BONUS_PERCENT : 0
}

export function getStreamBonusPercent(isGoodIdVerified: boolean): number {
  return isGoodIdVerified ? STREAM_BONUS_PERCENT : 0
}

export function formatProfileUsd(usd: bigint): string {
  return (Number(usd) / 1_000_000).toFixed(4)
}

export function formatUsdDisplay(usd: string, decimals = 2): string {
  const value = Number.parseFloat(usd)
  if (!Number.isFinite(value) || value <= 0) return `US$ ${(0).toFixed(decimals)}`
  return `US$ ${value.toFixed(decimals)}`
}

export function formatUsdWithBonus(principalUsd: string, bonusPercent: number): string {
  const principal = Number.parseFloat(principalUsd)
  if (!Number.isFinite(principal) || principal <= 0) return formatUsdDisplay('0', 4)
  if (bonusPercent <= 0) return formatUsdDisplay(principalUsd, 4)
  return formatUsdDisplay((principal * (1 + bonusPercent / 100)).toFixed(4), 4)
}

export function formatUsdMicro(usdMicro: string): string {
  return (Number(usdMicro || '0') / 1_000_000).toFixed(4)
}

export function formatUsdMicroDisplay(usdMicro: string): string {
  return formatUsdDisplay(formatUsdMicro(usdMicro), 4)
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

function bonusUsdFromPrincipal(principalUsd: bigint, bonusPercent: number): bigint {
  if (principalUsd <= 0n || bonusPercent <= 0) return 0n
  return (principalUsd * BigInt(bonusPercent)) / 100n
}

export function buildQuoteAmounts(depositG: string, streamG: string): AiCreditsQuote {
  return {
    depositAmountG: depositG,
    streamAmountG: streamG,
  }
}

export function quoteDepositPrincipalUsd(quote: AiCreditsQuote, gdUsdPerToken: number): string {
  const principal = gdWeiToUsd(gToWei(quote.depositAmountG), gdUsdPerToken)
  return formatProfileUsd(principal)
}

export function quoteStreamPrincipalUsd(quote: AiCreditsQuote, gdUsdPerToken: number): string {
  const principal = gdWeiToUsd(gToWei(quote.streamAmountG), gdUsdPerToken)
  return formatProfileUsd(principal)
}

export function quoteDepositBonusUsd(
  quote: AiCreditsQuote,
  gdUsdPerToken: number,
  isGoodIdVerified: boolean,
): string {
  const principal = gdWeiToUsd(gToWei(quote.depositAmountG), gdUsdPerToken)
  return formatProfileUsd(
    bonusUsdFromPrincipal(principal, getDepositBonusPercent(isGoodIdVerified)),
  )
}

export function quoteStreamBonusUsd(
  quote: AiCreditsQuote,
  gdUsdPerToken: number,
  isGoodIdVerified: boolean,
): string {
  const principal = gdWeiToUsd(gToWei(quote.streamAmountG), gdUsdPerToken)
  return formatProfileUsd(
    bonusUsdFromPrincipal(principal, getStreamBonusPercent(isGoodIdVerified)),
  )
}

export function quoteTotalUsdMicro(
  quote: AiCreditsQuote,
  gdUsdPerToken: number,
  isGoodIdVerified: boolean,
): bigint {
  const depositPrincipal = gdWeiToUsd(gToWei(quote.depositAmountG), gdUsdPerToken)
  const streamPrincipal = gdWeiToUsd(gToWei(quote.streamAmountG), gdUsdPerToken)
  const depositBonus = bonusUsdFromPrincipal(
    depositPrincipal,
    getDepositBonusPercent(isGoodIdVerified),
  )
  const streamBonus = bonusUsdFromPrincipal(
    streamPrincipal,
    getStreamBonusPercent(isGoodIdVerified),
  )
  return depositPrincipal + depositBonus + streamPrincipal + streamBonus
}

export function quoteTotalCredits(
  quote: AiCreditsQuote,
  gdUsdPerToken: number,
  isGoodIdVerified: boolean,
): string {
  return usdToCredits(quoteTotalUsdMicro(quote, gdUsdPerToken, isGoodIdVerified).toString())
}
