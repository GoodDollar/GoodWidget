import type { GovernanceAmount } from './types'

export function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(100, value))
}

export function formatRawValue(value: string | number): string {
  if (typeof value === 'string') {
    return value
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

export function formatCompactValue(value: string | number, maximumFractionDigits = 1): string {
  if (typeof value === 'string') {
    return value
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    notation: 'compact',
  }).format(value)
}

export function isGovernanceAmount(value: GovernanceAmount | string | number): value is GovernanceAmount {
  return typeof value === 'object' && value !== null && 'value' in value
}

export function fundingAmountLabel(amount: GovernanceAmount): string {
  const formattedValue = formatCompactValue(amount.value)
  return amount.token ? `${amount.token} ${formattedValue}` : formattedValue
}
