import { gToWei, parseGAmount } from './quoteMath'
import { parseAbi, type Address, type PublicClient } from 'viem'

const ONE_G_WEI = 10n ** 18n

const VAULT_MINIMUMS_ABI = parseAbi([
  'function minFirstDepositUsd() view returns (uint256)',
  'function minMonthlyStreamUsd() view returns (uint256)',
  'function totalDepositedGd(address account) view returns (uint256)',
  'function gdUsdPerToken(uint128 amount) view returns (uint256)',
])

export type VaultPaymentMinimums = {
  minDepositUsd: string | null
  minStreamUsd: string
}

export function formatMinGDisplay(amountWei: bigint): string {
  const raw = Number(amountWei) / 1e18
  if (!Number.isFinite(raw) || raw <= 0) return '0'
  if (raw >= 1000) return Math.ceil(raw).toString()
  if (raw >= 10) return (Math.ceil(raw * 10) / 10).toFixed(1)
  return (Math.ceil(raw * 100) / 100).toFixed(2)
}

export function formatMinGDisplayLocale(amountG: string): string {
  const value = parseGAmount(amountG)
  if (value <= 0) return amountG
  if (value >= 1000) return Math.ceil(value).toLocaleString('en-US')
  return amountG
}

export function formatMinUsdDisplay(usd: string): string {
  const value = Number.parseFloat(usd)
  if (!Number.isFinite(value) || value <= 0) return '$0.00'
  return `$${value.toFixed(2)}`
}

function parseUsdThreshold(usd: string | null): number {
  if (usd === null) return 0
  const value = Number.parseFloat(usd)
  return Number.isFinite(value) && value > 0 ? value : 0
}

export function getPaymentAmountValidation(params: {
  depositAmount: string
  streamAmount: string
  minDepositUsd: string | null
  minStreamUsd: string | null
  quote: { depositAmountUsd: string; streamAmountUsd: string } | null
  gBalance: string | null
}): {
  depositBelowMin: boolean
  streamBelowMin: boolean
  overBalance: boolean
  vaultMinimumsMet: boolean
} {
  const depositG = parseGAmount(params.depositAmount)
  const streamG = parseGAmount(params.streamAmount)
  const balance = parseGAmount(params.gBalance ?? '0')
  const minDepositUsd = parseUsdThreshold(params.minDepositUsd)
  const minStreamUsd = parseUsdThreshold(params.minStreamUsd)
  const depositUsd = params.quote ? Number.parseFloat(params.quote.depositAmountUsd) : 0
  const streamUsd = params.quote ? Number.parseFloat(params.quote.streamAmountUsd) : 0
  const depositBelowMin =
    depositG > 0 && minDepositUsd > 0 && params.quote !== null && depositUsd < minDepositUsd
  const streamBelowMin =
    streamG > 0 && minStreamUsd > 0 && params.quote !== null && streamUsd < minStreamUsd
  const overBalance = depositG + streamG > balance
  const minsLoaded = params.minStreamUsd !== null
  const vaultMinimumsMet = !minsLoaded || (!depositBelowMin && !streamBelowMin)

  return {
    depositBelowMin,
    streamBelowMin,
    overBalance,
    vaultMinimumsMet,
  }
}

export function getPayDisabledMessage(params: {
  canPay: boolean
  minsLoaded: boolean
  status: string
  minDepositUsd: string | null
  minStreamUsd: string | null
  validation: {
    depositBelowMin: boolean
    streamBelowMin: boolean
    overBalance: boolean
  }
}): string | null {
  if (params.canPay) return null
  if (!params.minsLoaded) return 'Loading vault minimums…'
  if (params.validation.overBalance) {
    return 'Total exceeds your G$ balance. Reduce the amounts.'
  }
  if (params.validation.depositBelowMin && params.minDepositUsd) {
    return `First deposit must be at least ${formatMinUsdDisplay(params.minDepositUsd)}.`
  }
  if (params.validation.streamBelowMin && params.minStreamUsd) {
    return `Monthly stream must be at least ${formatMinUsdDisplay(params.minStreamUsd)}.`
  }
  if (params.status !== 'quote_ready') {
    return 'Enter a deposit or monthly stream amount to continue.'
  }
  return 'Adjust the amounts to continue.'
}

function formatUsd18(usd18: bigint): string {
  return (Number(usd18) / 1e18).toFixed(2)
}

async function readGdUsd18(
  publicClient: PublicClient,
  vault: Address,
  gdAmountWei: bigint,
): Promise<bigint> {
  if (gdAmountWei <= 0n) return 0n
  return publicClient.readContract({
    address: vault,
    abi: VAULT_MINIMUMS_ABI,
    functionName: 'gdUsdPerToken',
    args: [gdAmountWei],
  })
}

async function minGdWeiForUsdThreshold(
  publicClient: PublicClient,
  vault: Address,
  minUsd18: bigint,
): Promise<bigint> {
  const usdPerOneG = await readGdUsd18(publicClient, vault, ONE_G_WEI)
  if (usdPerOneG <= 0n) return minUsd18
  return (minUsd18 * ONE_G_WEI + usdPerOneG - 1n) / usdPerOneG
}

export async function fetchVaultPaymentMinimums(
  publicClient: PublicClient,
  vault: Address,
  payer?: Address,
): Promise<VaultPaymentMinimums> {
  const [minFirstDepositUsd, minMonthlyStreamUsd] = await Promise.all([
    publicClient.readContract({
      address: vault,
      abi: VAULT_MINIMUMS_ABI,
      functionName: 'minFirstDepositUsd',
    }),
    publicClient.readContract({
      address: vault,
      abi: VAULT_MINIMUMS_ABI,
      functionName: 'minMonthlyStreamUsd',
    }),
  ])

  let minDepositUsd: string | null = formatUsd18(minFirstDepositUsd)
  if (payer) {
    const totalDeposited = await publicClient.readContract({
      address: vault,
      abi: VAULT_MINIMUMS_ABI,
      functionName: 'totalDepositedGd',
      args: [payer],
    })
    if (totalDeposited > 0n) {
      minDepositUsd = null
    }
  }

  return {
    minDepositUsd,
    minStreamUsd: formatUsd18(minMonthlyStreamUsd),
  }
}

export async function validateVaultPaymentAmounts(params: {
  publicClient: PublicClient
  vault: Address
  payer: Address
  depositAmount: string
  streamAmount: string
}): Promise<void> {
  const depositG = parseGAmount(params.depositAmount)
  const streamG = parseGAmount(params.streamAmount)
  const hasDeposit = depositG > 0
  const hasStream = streamG > 0

  if (!hasDeposit && !hasStream) {
    throw new Error('Enter a deposit or monthly stream amount')
  }

  const [minFirstDepositUsd, minMonthlyStreamUsd, totalDeposited] = await Promise.all([
    params.publicClient.readContract({
      address: params.vault,
      abi: VAULT_MINIMUMS_ABI,
      functionName: 'minFirstDepositUsd',
    }),
    params.publicClient.readContract({
      address: params.vault,
      abi: VAULT_MINIMUMS_ABI,
      functionName: 'minMonthlyStreamUsd',
    }),
    params.publicClient.readContract({
      address: params.vault,
      abi: VAULT_MINIMUMS_ABI,
      functionName: 'totalDepositedGd',
      args: [params.payer],
    }),
  ])

  if (hasStream) {
    const monthlyWei = gToWei(params.streamAmount)
    const streamUsd = await readGdUsd18(params.publicClient, params.vault, monthlyWei)
    if (streamUsd < minMonthlyStreamUsd) {
      const minWei = await minGdWeiForUsdThreshold(
        params.publicClient,
        params.vault,
        minMonthlyStreamUsd,
      )
      throw new Error(
        `Monthly stream must be at least ${formatMinGDisplay(minWei)} G$ (about $${formatUsd18(minMonthlyStreamUsd)} USD at the current G$ price)`,
      )
    }
  }

  if (hasDeposit && totalDeposited === 0n) {
    const depositWei = gToWei(params.depositAmount)
    const depositUsd = await readGdUsd18(params.publicClient, params.vault, depositWei)
    if (depositUsd < minFirstDepositUsd) {
      const minWei = await minGdWeiForUsdThreshold(
        params.publicClient,
        params.vault,
        minFirstDepositUsd,
      )
      throw new Error(
        `First deposit must be at least ${formatMinGDisplay(minWei)} G$ (about $${formatUsd18(minFirstDepositUsd)} USD at the current G$ price)`,
      )
    }
  }
}
