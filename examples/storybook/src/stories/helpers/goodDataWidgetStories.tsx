import React from 'react'
import { TamaguiProvider } from '@tamagui/core'
import { defaultConfig } from '@goodwidget/ui'
import { AiCreditsDashboard, type AnalyticsResponse } from '@goodwidget/gooddata-widget'

// Fixed (non-random, non-"now") fixture so every render and screenshot is byte-identical across runs.
const FIXED_ANALYTICS_RESPONSE: AnalyticsResponse = {
  days: 3,
  daily: [
    {
      date: '2026-01-01',
      gdOneTimeDepositsWei: '1000000000000000000000',
      // Kept off an exact 1/5 ratio of gdOneTimeDepositsWei (the original
      // fixture's 200/300/400 was exactly deposits/5 on every day) — on the
      // G$ Volume chart's independent per-series axes, two proportional
      // series normalize to identical pixel positions and the later-drawn
      // one fully occludes the other. Sum across the 3 days still matches
      // global.gdStreamedWei (900) below, accelerating to reflect the rising
      // gdTotalFlowRateWeiPerSecond.
      gdStreamedWei: '250000000000000000000',
      gdTotalFlowRateWeiPerSecond: '2000000000000000',
      aiCreditsUsedWei: '50000000',
      uniqueGdBuyers: 4,
      uniqueCreditUsers: 2,
      updatedAt: '2026-01-02T00:00:00.000Z',
      missing: false,
    },
    {
      date: '2026-01-02',
      gdOneTimeDepositsWei: '1500000000000000000000',
      gdStreamedWei: '280000000000000000000',
      gdTotalFlowRateWeiPerSecond: '3000000000000000',
      aiCreditsUsedWei: '75000000',
      uniqueGdBuyers: 6,
      uniqueCreditUsers: 3,
      updatedAt: '2026-01-03T00:00:00.000Z',
      missing: false,
    },
    {
      date: '2026-01-03',
      gdOneTimeDepositsWei: '2000000000000000000000',
      gdStreamedWei: '370000000000000000000',
      gdTotalFlowRateWeiPerSecond: '4000000000000000',
      aiCreditsUsedWei: '100000000',
      uniqueGdBuyers: 8,
      uniqueCreditUsers: 5,
      updatedAt: '2026-01-04T00:00:00.000Z',
      missing: false,
    },
  ],
  global: {
    gdOneTimeDepositsWei: '4500000000000000000000',
    gdStreamedWei: '900000000000000000000',
    aiCreditsUsedWei: '225000000',
    gdTotalFlowRateWeiPerSecond: '4000000000000000',
    updatedAt: '2026-01-04T00:00:00.000Z',
  },
  lastRun: {
    currentDate: '2026-01-04',
    updatedAt: '2026-01-04T00:00:00.000Z',
  },
}

/**
 * 30-day fixture shaped after real production data pulled from the live
 * AntSeed Worker (values rounded/synthesized, not the literal live figures):
 * `gdOneTimeDepositsWei` is sparse with occasional large spikes (0 most days,
 * then a jump into the thousands-to-tens-of-thousands range), while
 * `gdStreamedWei` moves independently in a much narrower band two orders of
 * magnitude smaller. The original `Live` fixture's smooth, proportionally-
 * scaled 3-day ramp doesn't exercise this — it's what motivated fix #4
 * (verifying the G$ Volume chart's secondaryYAxis stays legible at this
 * magnitude disparity, not just in the demo ramp).
 */
function buildRealisticVolumeDaily(): AnalyticsResponse['daily'] {
  const gdWei = (gd: number) => String(BigInt(Math.round(gd * 10000)) * 10n ** 14n)
  const rows: Array<{ date: string; depositsGd: number; streamedGd: number; creditUsersGd: number }> = [
    { date: '2026-08-02', depositsGd: 0, streamedGd: 590, creditUsersGd: 0 },
    { date: '2026-08-03', depositsGd: 0, streamedGd: 590, creditUsersGd: 0 },
    { date: '2026-08-04', depositsGd: 0, streamedGd: 590, creditUsersGd: 0 },
    { date: '2026-08-05', depositsGd: 8800, streamedGd: 590, creditUsersGd: 0 },
    { date: '2026-08-06', depositsGd: 0, streamedGd: 590, creditUsersGd: 1 },
    { date: '2026-08-07', depositsGd: 0, streamedGd: 590, creditUsersGd: 0 },
    { date: '2026-08-08', depositsGd: 0, streamedGd: 590, creditUsersGd: 0 },
    { date: '2026-08-09', depositsGd: 0, streamedGd: 590, creditUsersGd: 0 },
    { date: '2026-08-10', depositsGd: 10000, streamedGd: 590, creditUsersGd: 0 },
    { date: '2026-08-11', depositsGd: 0, streamedGd: 590, creditUsersGd: 1 },
    { date: '2026-08-12', depositsGd: 31500, streamedGd: 672, creditUsersGd: 1 },
    { date: '2026-08-13', depositsGd: 8610, streamedGd: 875, creditUsersGd: 2 },
    { date: '2026-08-14', depositsGd: 15000, streamedGd: 880, creditUsersGd: 2 },
    { date: '2026-08-15', depositsGd: 0, streamedGd: 880, creditUsersGd: 2 },
    { date: '2026-08-16', depositsGd: 0, streamedGd: 880, creditUsersGd: 2 },
    { date: '2026-08-17', depositsGd: 7828, streamedGd: 880, creditUsersGd: 2 },
    { date: '2026-08-18', depositsGd: 0, streamedGd: 880, creditUsersGd: 2 },
    { date: '2026-08-19', depositsGd: 0, streamedGd: 880, creditUsersGd: 2 },
    { date: '2026-08-20', depositsGd: 49800, streamedGd: 880, creditUsersGd: 2 },
    { date: '2026-08-21', depositsGd: 0, streamedGd: 880, creditUsersGd: 2 },
    { date: '2026-08-22', depositsGd: 0, streamedGd: 880, creditUsersGd: 2 },
    { date: '2026-08-23', depositsGd: 0, streamedGd: 880, creditUsersGd: 2 },
    { date: '2026-08-24', depositsGd: 0, streamedGd: 880, creditUsersGd: 2 },
    { date: '2026-08-25', depositsGd: 0, streamedGd: 587, creditUsersGd: 2 },
    { date: '2026-08-26', depositsGd: 0, streamedGd: 587, creditUsersGd: 2 },
    { date: '2026-08-27', depositsGd: 10000, streamedGd: 774, creditUsersGd: 2 },
    { date: '2026-08-28', depositsGd: 8002, streamedGd: 1321, creditUsersGd: 3 },
    { date: '2026-08-29', depositsGd: 0, streamedGd: 917, creditUsersGd: 3 },
    { date: '2026-08-30', depositsGd: 0, streamedGd: 917, creditUsersGd: 3 },
    { date: '2026-08-31', depositsGd: 10000, streamedGd: 1134, creditUsersGd: 3 },
  ]

  return rows.map((row, index) => ({
    date: row.date,
    gdOneTimeDepositsWei: gdWei(row.depositsGd),
    gdStreamedWei: gdWei(row.streamedGd),
    gdTotalFlowRateWeiPerSecond: gdWei(row.streamedGd / 86400),
    aiCreditsUsedWei: String((row.creditUsersGd > 0 ? row.creditUsersGd : 0) * 500000),
    uniqueGdBuyers: row.depositsGd > 0 ? 1 : 0,
    uniqueCreditUsers: row.creditUsersGd,
    updatedAt: `${row.date}T23:59:59.999Z`,
    missing: false,
  }))
}

const REALISTIC_VOLUME_DAILY = buildRealisticVolumeDaily()
const REALISTIC_VOLUME_RESPONSE: AnalyticsResponse = {
  days: REALISTIC_VOLUME_DAILY.length,
  daily: REALISTIC_VOLUME_DAILY,
  global: {
    gdOneTimeDepositsWei: String(
      REALISTIC_VOLUME_DAILY.reduce((sum, day) => sum + BigInt(day.gdOneTimeDepositsWei), 0n),
    ),
    gdStreamedWei: REALISTIC_VOLUME_DAILY[REALISTIC_VOLUME_DAILY.length - 1].gdStreamedWei,
    aiCreditsUsedWei: String(
      REALISTIC_VOLUME_DAILY.reduce((sum, day) => sum + BigInt(day.aiCreditsUsedWei), 0n),
    ),
    gdTotalFlowRateWeiPerSecond: REALISTIC_VOLUME_DAILY[REALISTIC_VOLUME_DAILY.length - 1].gdTotalFlowRateWeiPerSecond,
    updatedAt: `${REALISTIC_VOLUME_DAILY[REALISTIC_VOLUME_DAILY.length - 1].date}T23:59:59.999Z`,
  },
  lastRun: {
    currentDate: REALISTIC_VOLUME_DAILY[REALISTIC_VOLUME_DAILY.length - 1].date,
    updatedAt: `${REALISTIC_VOLUME_DAILY[REALISTIC_VOLUME_DAILY.length - 1].date}T23:59:59.999Z`,
  },
}

/** Wraps the dashboard in the same bare TamaguiProvider the thin-host app uses (no GoodWidgetProvider — this widget has no wallet/connect concerns). */
function GoodDataWidgetStoryShell({ dataTestId, children }: { dataTestId: string; children: React.ReactNode }) {
  return (
    <TamaguiProvider config={defaultConfig} defaultTheme="dark">
      <div data-testid={dataTestId}>{children}</div>
    </TamaguiProvider>
  )
}

export function AiCreditsDashboardLoadingStory() {
  return (
    <GoodDataWidgetStoryShell dataTestId="GoodDataWidget-loading">
      <AiCreditsDashboard mockState={{ kind: 'loading' }} />
    </GoodDataWidgetStoryShell>
  )
}

export function AiCreditsDashboardLiveStory() {
  return (
    <GoodDataWidgetStoryShell dataTestId="GoodDataWidget-live">
      <AiCreditsDashboard mockState={{ kind: 'live', response: FIXED_ANALYTICS_RESPONSE }} />
    </GoodDataWidgetStoryShell>
  )
}

export function AiCreditsDashboardDemoStory() {
  return (
    <GoodDataWidgetStoryShell dataTestId="GoodDataWidget-demo">
      <AiCreditsDashboard mockState={{ kind: 'demo', response: FIXED_ANALYTICS_RESPONSE }} />
    </GoodDataWidgetStoryShell>
  )
}

export function AiCreditsDashboardRealisticVolumeStory() {
  return (
    <GoodDataWidgetStoryShell dataTestId="GoodDataWidget-realistic-volume">
      <AiCreditsDashboard mockState={{ kind: 'live', response: REALISTIC_VOLUME_RESPONSE }} />
    </GoodDataWidgetStoryShell>
  )
}

export function AiCreditsDashboardLiveUnavailableStory() {
  return (
    <GoodDataWidgetStoryShell dataTestId="GoodDataWidget-live-unavailable">
      <AiCreditsDashboard mockState={{ kind: 'liveUnavailable' }} />
    </GoodDataWidgetStoryShell>
  )
}

export function AiCreditsDashboardEmptyStory() {
  return (
    <GoodDataWidgetStoryShell dataTestId="GoodDataWidget-empty">
      <AiCreditsDashboard mockState={{ kind: 'empty' }} />
    </GoodDataWidgetStoryShell>
  )
}
