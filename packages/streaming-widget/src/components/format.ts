import type { Address } from 'viem'
import { formatUnits } from 'viem'
import type { StreamTimeUnit } from '../widgetRuntimeContract'
import { STREAMING_CHAINS } from '../widgetRuntimeContract'
import type { SuperTokenSymbol } from './shared'

const SECONDS_PER_DAY = 24 * 60 * 60
const SECONDS_PER_MONTH = 30 * SECONDS_PER_DAY

export const SUPERFLUID_APP_URL = 'https://app.superfluid.org/'

export const TIME_UNIT_OPTIONS: Array<{ value: StreamTimeUnit; label: string }> = [
  { value: 'month', label: 'per month' },
  { value: 'day', label: 'per day' },
  { value: 'year', label: 'per year' },
]

function formatDisplayAmount(amount: string | number): string {
  const amountNumber = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(amountNumber)) return String(amount)

  return new Intl.NumberFormat('en-US', {
    maximumSignificantDigits: 6,
    minimumFractionDigits: 0,
    notation: Math.abs(amountNumber) >= 1_000_000 ? 'compact' : 'standard',
    useGrouping: true,
  }).format(amountNumber)
}

export function formatFlowRatePerMonth(flowRate: bigint, decimals = 18): string {
  if (flowRate === 0n) return '0'

  const perMonth = flowRate * BigInt(SECONDS_PER_MONTH)
  return formatDisplayAmount(formatUnits(perMonth, decimals))
}

export function formatFlowRatePerDay(flowRate: bigint, decimals = 18): string {
  if (flowRate === 0n) return '0'

  const perDay = flowRate * BigInt(SECONDS_PER_DAY)
  return formatDisplayAmount(formatUnits(perDay, decimals))
}

export function formatTimestamp(unixSeconds: number): string {
  if (!unixSeconds) return 'N/A'
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function chainName(chainId: number): string {
  if (chainId === STREAMING_CHAINS.CELO) return 'Celo'
  if (chainId === STREAMING_CHAINS.BASE) return 'Base'
  return `Chain ${chainId}`
}

export function tokenSymbol(chainId: number | null): SuperTokenSymbol {
  return chainId === STREAMING_CHAINS.BASE ? 'SUP' : 'G$'
}

export function formatWeiAmount(amount: bigint): string {
  return formatDisplayAmount(formatUnits(amount, 18))
}

export function superfluidReserveUrl(address: Address): string {
  return `https://app.superfluid.org/?view=${address}`
}
