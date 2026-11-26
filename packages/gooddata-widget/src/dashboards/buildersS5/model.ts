/**
 * Builders season 5 card rules, kept free of React so they can be tested on their own: given one metric and the
 * latest report, decide what the card shows (bars, or a text box that says why there is nothing to draw) and how
 * numbers and dates are written. Current values come from the latest report; a missing value is never treated as zero.
 */
import type { MetricDefinition, MetricUnit } from './metrics'
import type { BuildersReport } from './connector'

const DAY_MS = 86_400_000
/** gbmetrics collects 14 days before the first report's date; the collection start is that many days earlier. */
export const LOOKBACK_DAYS = 14

export interface BarRow {
  team: string
  value: number
}

export type CardModel =
  | {
      kind: 'bars'
      /** Teams with a value, highest first (ties keep report order). */
      rows: BarRow[]
      /** One line naming the teams without a value and why, or null when every team has one. */
      missingNote: string | null
      /** Which period the numbers cover, e.g. "Accumulated since Nov 1, report of Nov 15". */
      periodLabel: string
      /** Exact values for rows an abbreviated label hides, or null when every label is already exact. */
      exactNote: string | null
    }
  | {
      kind: 'placeholder'
      /** Why there is no chart. */
      text: string
    }

function parseIsoDate(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

/** "Nov 15", in UTC so the label never shifts with the reader's time zone. */
export function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** "Sun Nov 15, 2026". */
export function formatLongDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** The day counting started: the first report's date minus gbmetrics' 14-day lookback. */
export function collectionStart(firstReportDate: string): number {
  return parseIsoDate(firstReportDate) - LOOKBACK_DAYS * DAY_MS
}

/** The page headline, e.g. "Report of Sun Nov 15, 2026. Totals since Sun Nov 1." */
export function reportHeadline(reportDate: string, firstReportDate: string | null): string {
  const head = `Report of ${formatLongDate(parseIsoDate(reportDate))}.`
  if (!firstReportDate) return head
  return `${head} Totals since ${formatLongDate(collectionStart(firstReportDate))}.`
}

/** Writes a number short from 10,000 up (20.3K, 1.7M, 2.4B); smaller numbers are written in full, rounded to whole units. */
export function formatShort(value: number): string {
  const abs = Math.abs(value)
  if (abs < 10_000) return Math.round(value).toLocaleString('en-US')
  const [divisor, suffix] = abs >= 1e9 ? [1e9, 'B'] : abs >= 1e6 ? [1e6, 'M'] : [1e3, 'K']
  return `${(value / divisor).toFixed(1).replace(/\.0$/, '')}${suffix}`
}

/** The full value with thousands separators; a rate keeps one decimal. */
export function formatExact(value: number, unit: MetricUnit): string {
  if (unit === 'pct') return `${(value * 100).toFixed(1)}%`
  const whole = Math.round(value).toLocaleString('en-US')
  return unit === 'gd' ? `G$ ${whole}` : whole
}

/** The label drawn on a bar. Retention rates arrive as 0..1 and are written as percentages. */
export function formatBarLabel(value: number, unit: MetricUnit): string {
  if (unit === 'pct') return formatExact(value, unit)
  return unit === 'gd' ? `G$ ${formatShort(value)}` : formatShort(value)
}

function periodLabel(metric: MetricDefinition, report: BuildersReport, firstReportDate: string | null): string {
  const reportDate = formatShortDate(parseIsoDate(report.date))
  if (metric.asIs || !firstReportDate) return `Report of ${reportDate}`
  return `Accumulated since ${formatShortDate(collectionStart(firstReportDate))}, report of ${reportDate}`
}

/** Works out what one card shows for the latest report. */
export function buildCardModel(
  metric: MetricDefinition,
  report: BuildersReport,
  firstReportDate: string | null,
): CardModel {
  const rows: BarRow[] = []
  const without: string[] = []
  for (const team of report.teams) {
    const value = team.results[metric.key]
    if (typeof value === 'number') rows.push({ team: team.name, value })
    else without.push(team.name)
  }

  if (rows.length === 0) {
    // No team has a value, so there is nothing to draw. Say why, in this order: the metric cannot have a value yet
    // (reports dated before its first-value date), no team registered the account it needs (only after a report that
    // finished without errors), or it is simply not in the report.
    if (metric.firstValueDate && report.date < metric.firstValueDate) {
      return { kind: 'placeholder', text: `First value in the ${formatShortDate(parseIsoDate(metric.firstValueDate))} report.` }
    }
    if (metric.noneRegistered && report.status === 'success' && without.length > 0) {
      return { kind: 'placeholder', text: `${metric.noneRegistered}: ${without.join(', ')}` }
    }
    return { kind: 'placeholder', text: `Not in the latest report (${formatShortDate(parseIsoDate(report.date))}).` }
  }

  rows.sort((a, b) => b.value - a.value)

  let missingNote: string | null = null
  if (without.length > 0) {
    // Only a report that finished without errors can say the account is missing from the registry; after a partial
    // run a missing key may be a failed lookup, so the wording stays neutral.
    const reason =
      metric.noneRegistered && report.status === 'success' ? metric.noneRegistered : 'Not measured in this report'
    missingNote = `${reason}: ${without.join(', ')}`
  }

  const hidden = rows.filter((row) => Math.abs(row.value) >= 10_000)
  const exactNote =
    hidden.length > 0 && metric.unit !== 'pct'
      ? `Exact values: ${hidden.map((row) => `${row.team} ${formatExact(row.value, metric.unit)}`).join(', ')}`
      : null

  return { kind: 'bars', rows, missingNote, periodLabel: periodLabel(metric, report, firstReportDate), exactNote }
}
