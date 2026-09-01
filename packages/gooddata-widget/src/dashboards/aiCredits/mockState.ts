import type { AnalyticsDataSource } from './useAiCreditsDashboardData'
import type { AnalyticsResponse } from './connector'

/**
 * Deterministic fixtures for Storybook QA stories and Playwright screenshot
 * baselines — bypasses the real connector/timers entirely so the same state
 * renders identically on every run, matching the mockState pattern used by
 * other GoodWidget packages (e.g. GoodReserveWidget).
 */
export type AiCreditsDashboardMockState =
  | { kind: 'loading' }
  | { kind: 'live'; response: AnalyticsResponse }
  | { kind: 'demo'; response: AnalyticsResponse }
  | { kind: 'liveUnavailable' }
  | { kind: 'empty' }

export interface AiCreditsDashboardViewProps {
  data: AnalyticsResponse | null
  source: AnalyticsDataSource
  isInitialLoadComplete: boolean
  isRefreshing: boolean
  isLiveUnavailable: boolean
  onSelectSource: (source: AnalyticsDataSource) => void
  onRefresh: () => void
}

const EMPTY_RESPONSE: AnalyticsResponse = {
  days: 0,
  daily: [],
  global: {
    gdOneTimeDepositsWei: '0',
    gdStreamedWei: '0',
    aiCreditsUsedWei: '0',
    gdTotalFlowRateWeiPerSecond: '0',
    updatedAt: new Date(0).toISOString(),
  },
  lastRun: {
    currentDate: new Date(0).toISOString().slice(0, 10),
    updatedAt: new Date(0).toISOString(),
  },
}

/** Derives the same props shape the live hook produces, from a static fixture. Callbacks are no-ops since QA fixtures are read-only snapshots. */
export function buildMockViewProps(
  mockState: AiCreditsDashboardMockState,
): Omit<AiCreditsDashboardViewProps, 'onSelectSource' | 'onRefresh'> {
  switch (mockState.kind) {
    case 'loading':
      return { data: null, source: 'demo', isInitialLoadComplete: false, isRefreshing: false, isLiveUnavailable: false }
    case 'live':
      return { data: mockState.response, source: 'live', isInitialLoadComplete: true, isRefreshing: false, isLiveUnavailable: false }
    case 'demo':
      return { data: mockState.response, source: 'demo', isInitialLoadComplete: true, isRefreshing: false, isLiveUnavailable: false }
    case 'liveUnavailable':
      return { data: null, source: 'live', isInitialLoadComplete: true, isRefreshing: false, isLiveUnavailable: true }
    case 'empty':
      return { data: EMPTY_RESPONSE, source: 'demo', isInitialLoadComplete: true, isRefreshing: false, isLiveUnavailable: false }
  }
}
