/**
 * generateDemoData — produces a 30-day mock analytics payload shaped exactly
 * like the live Worker response, for use when the live endpoint is
 * unreachable or the user explicitly switches to "Demo" mode. Ported from
 * generateMockData() in GoodDollar/data-team's reference dashboard app.js.
 *
 * Values ramp up over the 30-day window (oldest day has the least activity,
 * today has the most) to make the demo charts look like a plausible growth
 * curve rather than flat noise.
 */
import type { AnalyticsResponse, DailyAnalyticsRecord } from './analyticsApi'

const DEMO_DAY_COUNT = 30
const GD_DECIMALS = 10n ** 18n
const USD_DECIMALS = 10n ** 6n
const SECONDS_PER_DAY = 86400

function isoDateDaysAgo(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().slice(0, 10)
}

/** Random integer in [min, max), scaled by `ramp` (0..1) so early days trend lower than recent days. */
function rampedRandomInt(min: number, max: number, ramp: number): number {
  return Math.floor((min + Math.random() * (max - min)) * ramp)
}

function buildDailyRecord(daysAgo: number): DailyAnalyticsRecord {
  // ramp goes from ~0 (30 days ago) to 1 (today), simulating adoption growth.
  const ramp = (DEMO_DAY_COUNT - daysAgo) / DEMO_DAY_COUNT
  const depositsGd = rampedRandomInt(800, 2000, ramp)
  const streamedGd = rampedRandomInt(200, 800, ramp)
  const creditsUsd = rampedRandomInt(50, 200, ramp)
  // `|| 1` mirrors the reference: a day with near-zero ramp should still show at least one active wallet, not zero.
  const uniqueGdBuyers = rampedRandomInt(2, 10, ramp) || 1
  const uniqueCreditUsers = rampedRandomInt(1, 6, ramp) || 1
  const flowRatePerSecondGd = Math.floor(streamedGd / SECONDS_PER_DAY)

  return {
    date: isoDateDaysAgo(daysAgo),
    gdOneTimeDepositsWei: String(BigInt(depositsGd) * GD_DECIMALS),
    gdStreamedWei: String(BigInt(streamedGd) * GD_DECIMALS),
    gdTotalFlowRateWeiPerSecond: String(BigInt(flowRatePerSecondGd) * GD_DECIMALS),
    aiCreditsUsedWei: String(BigInt(creditsUsd) * USD_DECIMALS),
    uniqueGdBuyers,
    uniqueCreditUsers,
    updatedAt: new Date().toISOString(),
    missing: false,
  }
}

/** Sums a wei field across all daily records in BigInt space, returning the total as a decimal string (never coerced to Number, to preserve full precision for the caller's own conversion). */
function sumWeiField(daily: DailyAnalyticsRecord[], field: keyof DailyAnalyticsRecord): string {
  const total = daily.reduce((sum, record) => sum + BigInt(record[field] as string), 0n)
  return String(total)
}

/**
 * Builds one full demo AnalyticsResponse. Callers should generate this once
 * and cache the result (see useAnalyticsData.ts) rather than regenerating it
 * on every failed live fetch, so the demo dataset stays stable across
 * retries within a session.
 */
export function generateDemoData(): AnalyticsResponse {
  const daily: DailyAnalyticsRecord[] = []
  for (let daysAgo = DEMO_DAY_COUNT - 1; daysAgo >= 0; daysAgo--) {
    daily.push(buildDailyRecord(daysAgo))
  }

  const mostRecentDay = daily[daily.length - 1]
  const nowIso = new Date().toISOString()

  return {
    days: DEMO_DAY_COUNT,
    daily,
    global: {
      gdOneTimeDepositsWei: sumWeiField(daily, 'gdOneTimeDepositsWei'),
      gdStreamedWei: sumWeiField(daily, 'gdStreamedWei'),
      aiCreditsUsedWei: sumWeiField(daily, 'aiCreditsUsedWei'),
      // Flow rate is an instantaneous rate, not a sum — the most recent day's rate stands in for "current", matching the reference.
      gdTotalFlowRateWeiPerSecond: mostRecentDay.gdTotalFlowRateWeiPerSecond,
      updatedAt: nowIso,
    },
    lastRun: {
      currentDate: nowIso.slice(0, 10),
      updatedAt: nowIso,
    },
  }
}
