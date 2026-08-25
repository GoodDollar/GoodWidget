import { useState, useEffect, useCallback } from 'react'
import type { AnalyticsResponse, ProcessedDailyData, ProcessedGlobalData, ChartDataPoint } from '../types/analytics'
import { weiToGd, flowRateToDaily } from '../utils/format'

const API_BASE_URL = import.meta.env.VITE_ANALYTICS_API_URL || 'https://api.gooddollar.org/antseed-analytics'
const REFRESH_SECRET = import.meta.env.VITE_REFRESH_SECRET || ''

interface UseAnalyticsReturn {
  dailyData: ProcessedDailyData[]
  globalData: ProcessedGlobalData | null
  chart1Data: ChartDataPoint[] // G$ Volume
  chart2Data: ChartDataPoint[] // AI Credits/day
  chart3Data: ChartDataPoint[] // Unique wallets
  lastRun: string | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useAnalytics(): UseAnalyticsReturn {
  const [dailyData, setDailyData] = useState<ProcessedDailyData[]>([])
  const [globalData, setGlobalData] = useState<ProcessedGlobalData | null>(null)
  const [chart1Data, setChart1Data] = useState<ChartDataPoint[]>([])
  const [chart2Data, setChart2Data] = useState<ChartDataPoint[]>([])
  const [chart3Data, setChart3Data] = useState<ChartDataPoint[]>([])
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const processData = useCallback((response: AnalyticsResponse) => {
    // Process daily data
    const processedDaily: ProcessedDailyData[] = response.daily.map((day) => ({
      date: day.date,
      gdVolume: weiToGd(day.gdOneTimeDepositsWei) + weiToGd(day.gdStreamedWei),
      aiCreditsUsed: weiToGd(day.aiCreditsUsedWei),
      uniqueGdBuyers: day.uniqueGdBuyers,
      uniqueCreditUsers: day.uniqueCreditUsers,
      flowRateDaily: flowRateToDaily(day.gdTotalFlowRateWeiPerSecond),
      missing: day.missing,
    }))

    // Sort by date ascending
    processedDaily.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Process global data
    const processedGlobal: ProcessedGlobalData = {
      totalGdVolume: weiToGd(response.global.gdOneTimeDepositsWei) + weiToGd(response.global.gdStreamedWei),
      totalAiCreditsUsed: weiToGd(response.global.aiCreditsUsedWei),
      totalFlowRateDaily: flowRateToDaily(response.global.gdTotalFlowRateWeiPerSecond),
      lastUpdated: response.global.updatedAt,
    }

    // Chart 1: G$ Volume over time (line/area chart with two series)
    const c1Data: ChartDataPoint[] = processedDaily.flatMap((day) => [
      { x: day.date, y: weiToGd(response.daily.find(d => d.date === day.date)?.gdOneTimeDepositsWei || '0'), series: 'One-time Deposits' },
      { x: day.date, y: weiToGd(response.daily.find(d => d.date === day.date)?.gdStreamedWei || '0'), series: 'Streamed' },
    ])

    // Chart 2: AI Credits/day (bar chart)
    const c2Data: ChartDataPoint[] = processedDaily.map((day) => ({
      x: day.date,
      y: day.aiCreditsUsed,
    }))

    // Chart 3: Unique wallets over time (line chart with two series)
    const c3Data: ChartDataPoint[] = processedDaily.flatMap((day) => [
      { x: day.date, y: day.uniqueGdBuyers, series: 'Unique G$ Buyers' },
      { x: day.date, y: day.uniqueCreditUsers, series: 'Unique Credit Users' },
    ])

    setDailyData(processedDaily)
    setGlobalData(processedGlobal)
    setChart1Data(c1Data)
    setChart2Data(c2Data)
    setChart3Data(c3Data)
    setLastRun(response.lastRun.updatedAt)
  }, [])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/analytics`)
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`)
      }
      const data: AnalyticsResponse = await response.json()
      processData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [processData])

  const refresh = useCallback(async () => {
    if (!REFRESH_SECRET) {
      setError('Refresh secret not configured')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${REFRESH_SECRET}`,
        },
      })
      if (!response.ok) {
        throw new Error(`Failed to refresh: ${response.statusText}`)
      }
      const data: AnalyticsResponse = await response.json()
      processData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [processData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    dailyData,
    globalData,
    chart1Data,
    chart2Data,
    chart3Data,
    lastRun,
    isLoading,
    error,
    refresh,
  }
}