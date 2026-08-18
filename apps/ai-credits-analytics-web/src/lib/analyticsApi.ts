/**
 * analyticsApi — typed client for the AntSeed Analytics Worker consumed by
 * this dashboard. Ported from GoodDollar/data-team's
 * projects/antseed-analytics/dashboard/app.js, which talks to the same two
 * endpoints from vanilla JS.
 */

// The worker URL is overridable via VITE_ANTSEED_ANALYTICS_WORKER_URL so a
// deployment can point at a staging/production worker without a code change,
// but defaults to the same worker the reference dashboard hardcodes.
const DEFAULT_WORKER_URL = 'https://gooddollar-antseed-integration.gooddollar.workers.dev'
const WORKER_URL = import.meta.env.VITE_ANTSEED_ANALYTICS_WORKER_URL ?? DEFAULT_WORKER_URL

const ANALYTICS_ENDPOINT = `${WORKER_URL}/v1/analytics`
const REFRESH_ENDPOINT = `${WORKER_URL}/v1/analytics/refresh`

/** Number of days of history requested from the analytics endpoint, matching the reference dashboard. */
export const ANALYTICS_DAYS_REQUESTED = 365

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

/** Fetches the full analytics payload. Throws on any non-2xx response so callers can fall back to demo data. */
export async function fetchAnalytics(): Promise<AnalyticsResponse> {
  const response = await fetch(`${ANALYTICS_ENDPOINT}?days=${ANALYTICS_DAYS_REQUESTED}`)
  if (!response.ok) {
    throw new Error(`Analytics API responded with ${response.status}`)
  }
  return response.json() as Promise<AnalyticsResponse>
}

/** Triggers server-side re-aggregation. The response body isn't consumed by callers — only success/failure matters — but the request is still awaited so callers can catch a non-2xx status. */
export async function postRefresh(): Promise<void> {
  const response = await fetch(REFRESH_ENDPOINT, { method: 'POST' })
  if (!response.ok) {
    throw new Error(`Refresh API responded with ${response.status}`)
  }
}
