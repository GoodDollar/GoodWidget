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
      gdStreamedWei: '200000000000000000000',
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
      gdStreamedWei: '300000000000000000000',
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
      gdStreamedWei: '400000000000000000000',
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
