import { formatMetricValue } from '@goodwidget/ui'

/**
 * Convert wei (as string) to G$ (divide by 1e18)
 */
export function weiToGd(wei: string): number {
  return Number(wei) / 1e18
}

/**
 * Convert wei (as string) to USD using G$ price
 * @param wei - Wei amount as string
 * @param gdPriceUsd - G$ price in USD (default: 0.01)
 */
export function weiToUsd(wei: string, gdPriceUsd = 0.01): number {
  return weiToGd(wei) * gdPriceUsd
}

/**
 * Convert flow rate (wei per second) to daily G$ volume
 */
export function flowRateToDaily(flowRateWeiPerSecond: string): number {
  const flowRate = Number(flowRateWeiPerSecond)
  return (flowRate * 86400) / 1e18
}

/**
 * Format a number as compact (K/M/B) using the shared utility
 */
export function formatCompact(value: number, decimals = 1): string {
  return formatMetricValue(value, { format: 'compact', decimals })
}

/**
 * Format a number as decimal with fixed decimals
 */
export function formatDecimal(value: number, decimals = 2): string {
  return formatMetricValue(value, { format: 'decimal', decimals })
}

/**
 * Format a number as integer
 */
export function formatInteger(value: number): string {
  return formatMetricValue(value, { format: 'none', decimals: 0 })
}

/**
 * Format date as MM/DD
 */
export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

/**
 * Format date as MMM DD, YYYY
 */
export function formatLongDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}