export interface AnalyticsResponse {
  days: number
  daily: DailyAnalytics[]
  global: GlobalAnalytics
  lastRun: LastRunInfo
}

export interface DailyAnalytics {
  date: string
  gdOneTimeDepositsWei: string
  gdStreamedWei: string
  gdTotalFlowRateWeiPerSecond: string
  aiCreditsUsedWei: string
  uniqueGdBuyers: number
  uniqueCreditUsers: number
  updatedAt: string
  missing: boolean
}

export interface GlobalAnalytics {
  gdOneTimeDepositsWei: string
  gdStreamedWei: string
  aiCreditsUsedWei: string
  gdTotalFlowRateWeiPerSecond: string
  updatedAt: string
}

export interface LastRunInfo {
  currentDate: string
  updatedAt: string
}

export interface ProcessedDailyData {
  date: string
  gdVolume: number // G$ total (one-time + streamed)
  aiCreditsUsed: number
  uniqueGdBuyers: number
  uniqueCreditUsers: number
  flowRateDaily: number
  missing: boolean
}

export interface ProcessedGlobalData {
  totalGdVolume: number
  totalAiCreditsUsed: number
  totalFlowRateDaily: number
  lastUpdated: string
}

export interface ChartDataPoint {
  x: string
  y: number
  series?: string
}
