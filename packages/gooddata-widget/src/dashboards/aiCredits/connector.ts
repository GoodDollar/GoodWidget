/**
 * AI Credits connector — typed client for the AntSeed Analytics Worker.
 * Ported from GoodDollar/data-team's projects/antseed-analytics/dashboard/app.js,
 * which talks to the same two endpoints from vanilla JS. The worker URL is
 * threaded in via config rather than read from import.meta.env directly, so
 * this package stays bundler-agnostic (env-var resolution is the host app's job).
 */
import type { DataConnectorFactory } from '../../connectors/types'

const DEFAULT_WORKER_URL = 'https://gooddollar-antseed-integration.gooddollar.workers.dev'
/** Number of days of history requested from the analytics endpoint, matching the reference dashboard. */
const ANALYTICS_DAYS_REQUESTED = 365

/** One row of daily analytics. Wei amounts stay as strings end-to-end (see analyticsConversions.ts) so no precision is lost before the caller explicitly converts them. */
export interface DailyAnalyticsRecord {
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

export interface GlobalAnalyticsSummary {
  gdOneTimeDepositsWei: string
  gdStreamedWei: string
  aiCreditsUsedWei: string
  gdTotalFlowRateWeiPerSecond: string
  updatedAt: string
}

export interface LastRunSummary {
  currentDate: string
  updatedAt: string
}

export interface AnalyticsResponse {
  days: number
  daily: DailyAnalyticsRecord[]
  global: GlobalAnalyticsSummary
  lastRun: LastRunSummary
}

export interface AiCreditsConnectorConfig {
  /** Overrides the default AntSeed Worker URL, e.g. for staging deployments. */
  workerUrl?: string
}

/** Fetches the full analytics payload. Throws on any non-2xx response so callers can fall back to demo data. */
async function fetchAnalytics(workerUrl: string): Promise<AnalyticsResponse> {
  const response = await fetch(`${workerUrl}/v1/analytics?days=${ANALYTICS_DAYS_REQUESTED}`)
  if (!response.ok) {
    throw new Error(`Analytics API responded with ${response.status}`)
  }
  return response.json() as Promise<AnalyticsResponse>
}

/** Triggers server-side re-aggregation. The response body isn't consumed by callers — only success/failure matters — but the request is still awaited so callers can catch a non-2xx status. */
async function postRefresh(workerUrl: string): Promise<void> {
  const response = await fetch(`${workerUrl}/v1/analytics/refresh`, { method: 'POST' })
  if (!response.ok) {
    throw new Error(`Refresh API responded with ${response.status}`)
  }
}

export const AI_CREDITS_CONNECTOR_ID = 'ai-credits'

export const createAiCreditsConnector: DataConnectorFactory<AiCreditsConnectorConfig, AnalyticsResponse> = (
  config,
) => {
  const workerUrl = config.workerUrl ?? DEFAULT_WORKER_URL
  return {
    fetch: () => fetchAnalytics(workerUrl),
    refresh: () => postRefresh(workerUrl),
  }
}
