/**
 * Builders season 5 connector — read-only client for the stored weekly reports of gbmetrics
 * (GoodDollar/builders-metrics). It reads only two endpoints, `reports` (the list of report dates) and
 * `getReport?date=` (one stored report), and never calls anything that computes or writes.
 *
 * The browser asks for relative URLs under `baseUrl` ("/gbmetrics" by default). The host app forwards exactly
 * those two paths to gbmetrics (Vercel rewrites in production, a Vite proxy in development), because gbmetrics
 * sends no CORS headers and a browser cannot call it directly from the GoodData site.
 */
import type { DataConnector, DataConnectorFactory } from '../../connectors/types'

export const BUILDERS_S5_CONNECTOR_ID = 'builders-s5'

const DEFAULT_BASE_URL = '/gbmetrics'
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** One team's numbers in one report. Only finite numbers are kept; a key a team does not have is simply absent. */
export interface TeamReport {
  name: string
  results: Record<string, number>
}

export interface BuildersReport {
  /** ISO date (YYYY-MM-DD) the report is dated. */
  date: string
  /** gbmetrics' own status for the run: "success", "partial", or whatever it reports; "unknown" when it sent none. */
  status: string
  errors: string[]
  teams: TeamReport[]
}

export interface BuildersS5Data {
  /** The latest stored report, or null when gbmetrics has none yet. */
  report: BuildersReport | null
  /** Date of the earliest stored report. The collection start is derived from it. Null when there is no report. */
  firstReportDate: string | null
}

/** The one thing the connector needs from fetch: GET a URL and read its JSON. Narrower than `typeof fetch`, so tests can supply a plain function. */
export type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>

export interface BuildersS5ConnectorConfig {
  /** Base path the host app forwards to gbmetrics. Defaults to "/gbmetrics". */
  baseUrl?: string
  /** Replaces the global fetch, for tests. */
  fetchImpl?: FetchLike
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Reads the `/reports` answer and returns the available report dates in ascending order. Throws on a malformed answer. */
export function parseReportIndex(json: unknown): string[] {
  if (!isRecord(json) || !Array.isArray(json.reports)) {
    throw new Error('gbmetrics report index has an unexpected shape')
  }
  const dates = json.reports.filter((value): value is string => typeof value === 'string' && ISO_DATE.test(value))
  return [...new Set(dates)].sort()
}

/** Reads one stored report: `{ "<date>": { "<team>": { results: {...} } }, "_meta": { status, errors } }`. Throws when the dated block is missing. */
export function parseReport(date: string, json: unknown): BuildersReport {
  if (!isRecord(json) || !isRecord(json[date])) {
    throw new Error(`gbmetrics report for ${date} has an unexpected shape`)
  }
  const teams: TeamReport[] = []
  for (const [name, value] of Object.entries(json[date] as Record<string, unknown>)) {
    if (!isRecord(value) || !isRecord(value.results)) continue
    const results: Record<string, number> = {}
    for (const [key, metric] of Object.entries(value.results)) {
      if (typeof metric === 'number' && Number.isFinite(metric)) results[key] = metric
    }
    teams.push({ name, results })
  }
  const meta = isRecord(json._meta) ? json._meta : {}
  const errors = Array.isArray(meta.errors) ? meta.errors.map((entry) => String(entry)) : []
  return {
    date,
    status: typeof meta.status === 'string' ? meta.status : 'unknown',
    errors,
    teams,
  }
}

async function getJson(fetchImpl: FetchLike, url: string): Promise<unknown> {
  const response = await fetchImpl(url)
  if (!response.ok) {
    throw new Error(`gbmetrics responded with ${response.status} for ${url}`)
  }
  return response.json()
}

export const createBuildersS5Connector: DataConnectorFactory<BuildersS5ConnectorConfig, BuildersS5Data> = (
  config,
): DataConnector<BuildersS5Data> => {
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
  const fetchImpl: FetchLike = config.fetchImpl ?? ((url) => fetch(url))
  return {
    async fetch() {
      const dates = parseReportIndex(await getJson(fetchImpl, `${baseUrl}/reports`))
      if (dates.length === 0) return { report: null, firstReportDate: null }
      const latest = dates[dates.length - 1]
      const report = parseReport(latest, await getJson(fetchImpl, `${baseUrl}/getReport?date=${latest}`))
      return { report, firstReportDate: dates[0] }
    },
    // Reports are produced by gbmetrics on its own schedule; the page only reads them, so there is nothing to refresh.
    async refresh() {},
  }
}
