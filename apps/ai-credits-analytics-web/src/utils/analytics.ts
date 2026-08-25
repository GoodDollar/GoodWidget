/**
 * Analytics data fetching and transformation layer
 * Recreates the flow from data-team/projects/antseed-analytics/dashboard/app.js
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://gooddollar-antseed-integration.gooddollar.workers.dev'

// BigInt-safe conversion utilities
export function weiToGd(wei: string | bigint): number {
  const value = typeof wei === 'string' ? BigInt(wei) : wei
  return Number(value) / 1e18
}

export function weiToUsd(wei: string | bigint): number {
  const value = typeof wei === 'string' ? BigInt(wei) : wei
  return Number(value) / 1e6
}

export function flowRateToDaily(flowRate: string | bigint): number {
  const value = typeof flowRate === 'string' ? BigInt(flowRate) : flowRate
  // wei/sec * 86400 seconds/day / 1e18
  return (Number(value) * 86400) / 1e18
}

// Types matching the worker response
export interface DailyAnalytics {
  date: string
  g_deposited: string
  g_streamed: string
  total_g: string
  ai_credits_usd: string
  wallets_g: number
  wallets_ai: number
}

export interface AnalyticsResponse {
  daily: DailyAnalytics[]
  totals: {
    total_g_spent: string
    total_ai_credits_usd: string
    current_flow_rate: string
  }
}

export interface TransformedDailyData {
  date: string
  gDeposited: number
  gStreamed: number
  totalG: number
  aiCreditsUsd: number
  walletsG: number
  walletsAi: number
}

export interface TransformedAnalytics {
  daily: TransformedDailyData[]
  totals: {
    totalGSpent: number
    totalAiCreditsUsd: number
    currentFlowRateDaily: number
  }
}

/**
 * Fetch live analytics data from the worker
 */
export async function fetchLiveAnalytics(days = 365): Promise<TransformedAnalytics> {
  const response = await fetch(`${WORKER_URL}/v1/analytics?days=${days}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch analytics: ${response.status} ${response.statusText}`)
  }
  
  const data: AnalyticsResponse = await response.json()
  return transformAnalytics(data)
}

/**
 * Trigger a refresh of the analytics data
 */
export async function refreshAnalytics(): Promise<void> {
  const response = await fetch(`${WORKER_URL}/v1/analytics/refresh`, {
    method: 'POST',
  })
  
  if (!response.ok) {
    throw new Error(`Failed to refresh analytics: ${response.status} ${response.statusText}`)
  }
}

/**
 * Transform raw analytics data with proper BigInt conversions
 */
export function transformAnalytics(data: AnalyticsResponse): TransformedAnalytics {
  const daily = data.daily.map((day) => ({
    date: day.date,
    gDeposited: weiToGd(day.g_deposited),
    gStreamed: weiToGd(day.g_streamed),
    totalG: weiToGd(day.total_g),
    aiCreditsUsd: weiToUsd(day.ai_credits_usd),
    walletsG: day.wallets_g,
    walletsAi: day.wallets_ai,
  }))

  return {
    daily,
    totals: {
      totalGSpent: weiToGd(data.totals.total_g_spent),
      totalAiCreditsUsd: weiToUsd(data.totals.total_ai_credits_usd),
      currentFlowRateDaily: flowRateToDaily(data.totals.current_flow_rate),
    },
  }
}

/**
 * Generate demo data as fallback when live endpoint is unreachable
 * Matches the structure and approximate scale of real data
 */
export function generateDemoData(days = 365): TransformedAnalytics {
  const daily: TransformedDailyData[] = []
  const now = new Date()
  
  // Base values for demo data
  let cumulativeG = 0
  let cumulativeAiCredits = 0
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    // Simulate some variation in daily values
    const dayOfYear = date.getDate() + (date.getMonth() * 30)
    const variation = Math.sin(dayOfYear * 0.1) * 0.3 + 1 // 0.7 to 1.3
    
    const gDeposited = Math.max(0, (Math.random() * 50000 + 10000) * variation)
    const gStreamed = Math.max(0, (Math.random() * 20000 + 5000) * variation)
    const totalG = gDeposited + gStreamed
    const aiCreditsUsd = Math.max(0, (Math.random() * 500 + 100) * variation)
    const walletsG = Math.floor(Math.random() * 50 + 10)
    const walletsAi = Math.floor(Math.random() * 30 + 5)
    
    cumulativeG += totalG
    cumulativeAiCredits += aiCreditsUsd
    
    daily.push({
      date: dateStr,
      gDeposited,
      gStreamed,
      totalG,
      aiCreditsUsd,
      walletsG,
      walletsAi,
    })
  }

  return {
    daily,
    totals: {
      totalGSpent: cumulativeG,
      totalAiCreditsUsd: cumulativeAiCredits,
      currentFlowRateDaily: daily[daily.length - 1]?.gStreamed || 0,
    },
  }
}

/**
 * Format numbers for display
 */
export function formatNumber(value: number, decimals = 2): string {
  if (value >= 1e9) {
    return (value / 1e9).toFixed(decimals) + 'B'
  }
  if (value >= 1e6) {
    return (value / 1e6).toFixed(decimals) + 'M'
  }
  if (value >= 1e3) {
    return (value / 1e3).toFixed(decimals) + 'K'
  }
  return value.toFixed(decimals)
}

export function formatCurrency(value: number, currency = '$', decimals = 2): string {
  return currency + formatNumber(value, decimals)
}

export function formatGdollars(value: number, decimals = 2): string {
  return formatNumber(value, decimals) + ' G$'
}

export function formatPercent(value: number, decimals = 1): string {
  return (value * 100).toFixed(decimals) + '%'
}
