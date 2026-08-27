/**
 * useAiCreditsDashboardData — owns the full data-loading state machine for
 * the AI Credits dashboard: initial live-vs-demo resolution, manual source
 * switching, the refresh button's request/poll cycle, and the 5-minute
 * auto-refresh interval. Ported from the state/loadData/switchSource/
 * triggerRefresh functions in GoodDollar/data-team's reference dashboard
 * app.js, adapted to React state instead of direct DOM manipulation.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getConnector } from '../../connectors/registry'
import { AI_CREDITS_CONNECTOR_ID, type AnalyticsResponse } from './connector'
import { generateDemoData } from './generateDemoData'

/** Matches the reference dashboard's REFRESH_INTERVAL_MS (5 minutes). */
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000
/** Matches the reference dashboard's post-refresh wait before re-fetching, giving the Worker time to finish server-side aggregation. */
const REFRESH_SETTLE_DELAY_MS = 2000

export type AnalyticsDataSource = 'live' | 'demo'

export interface UseAiCreditsDashboardDataResult {
  /** The currently active dataset — live data, demo data, or null when the user has explicitly selected "Live" while the endpoint is unavailable (see isLiveUnavailable). */
  data: AnalyticsResponse | null
  /** Which source the toggle is currently set to, independent of whether that source actually has data available. */
  source: AnalyticsDataSource
  /** True once the initial load has resolved (either live or demo), so the UI can distinguish "loading" from "loaded with no data". */
  isInitialLoadComplete: boolean
  /** True while a manual refresh is in flight (post + settle delay + re-fetch). */
  isRefreshing: boolean
  /** True when the user has selected "Live" but the live endpoint is not reachable — the toggle must stay clickable in this state, and the UI shows an inline unavailable message instead of disabling anything. */
  isLiveUnavailable: boolean
  switchSource: (source: AnalyticsDataSource) => void
  refresh: () => Promise<void>
}

export function useAiCreditsDashboardData(): UseAiCreditsDashboardDataResult {
  const [liveData, setLiveData] = useState<AnalyticsResponse | null>(null)
  const [liveAvailable, setLiveAvailable] = useState(false)
  // Demo data is generated once and reused — regenerating it on every failed
  // live attempt would make the "demo" numbers change unpredictably every
  // 5 minutes via the auto-refresh timer, which defeats the point of a
  // stable fallback/demo dataset.
  const demoDataRef = useRef<AnalyticsResponse | null>(null)
  const [source, setSource] = useState<AnalyticsDataSource>('demo')
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const getDemoData = useCallback((): AnalyticsResponse => {
    if (!demoDataRef.current) {
      demoDataRef.current = generateDemoData()
    }
    return demoDataRef.current
  }, [])

  /**
   * Attempts the live fetch; updates the availability flags either way.
   * Only the initial mount load is allowed to set `source` automatically —
   * background loads (the 5-minute auto-refresh interval and the manual
   * refresh button) must never override a source the user already picked
   * via switchSource. `isLiveUnavailable` already reacts to `liveAvailable`
   * on its own, so a background load that changes availability still
   * surfaces correctly without touching `source`.
   */
  const loadData = useCallback(
    async (options: { isInitialLoad: boolean }) => {
      const connector = getConnector<AnalyticsResponse>(AI_CREDITS_CONNECTOR_ID)
      try {
        const response = await connector.fetch()
        setLiveData(response)
        setLiveAvailable(true)
        if (options.isInitialLoad) setSource('live')
      } catch (error) {
        console.warn('AntSeed analytics endpoint not reachable:', error)
        setLiveData(null)
        setLiveAvailable(false)
        // Ensure demo data exists so the fallback has something to show immediately.
        getDemoData()
        if (options.isInitialLoad) setSource('demo')
      } finally {
        setIsInitialLoadComplete(true)
      }
    },
    [getDemoData],
  )

  // Initial load, once on mount. Intentionally omits `loadData` from the
  // dependency array: we only want this to run a single time on mount, not
  // every time `loadData`'s identity changes (it's recreated whenever
  // `getDemoData` changes, which itself never changes after first render).
  useEffect(() => {
    void loadData({ isInitialLoad: true })
  }, [])

  // Auto-refresh every 5 minutes using whichever source is currently active,
  // matching the reference dashboard's single global refreshTimer. Passes
  // isInitialLoad: false so this never overrides a manual toggle selection.
  useEffect(() => {
    const intervalId = setInterval(() => {
      void loadData({ isInitialLoad: false })
    }, AUTO_REFRESH_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [loadData])

  /**
   * Manual toggle handler. Selecting "demo" always works (demo data is
   * generated locally). Selecting "live" while the endpoint has never
   * succeeded does NOT disable anything — it just leaves data as null so the
   * UI can render its own inline "endpoint not yet deployed" empty state,
   * per the reference dashboard's switchSource() behavior.
   */
  const switchSource = useCallback((next: AnalyticsDataSource) => {
    setSource(next)
  }, [])

  /** POSTs a refresh request, waits for server-side aggregation to settle, then re-fetches. On failure, still attempts a reload so the UI doesn't get stuck. Never treated as an initial load, so it can't override the user's source selection either. */
  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    const connector = getConnector<AnalyticsResponse>(AI_CREDITS_CONNECTOR_ID)
    try {
      await connector.refresh()
      await new Promise((resolve) => setTimeout(resolve, REFRESH_SETTLE_DELAY_MS))
      await loadData({ isInitialLoad: false })
    } catch (error) {
      console.error('Refresh request failed:', error)
      await loadData({ isInitialLoad: false })
    } finally {
      setIsRefreshing(false)
    }
  }, [loadData])

  const isLiveUnavailable = source === 'live' && !liveAvailable
  const data = source === 'live' ? (liveAvailable ? liveData : null) : getDemoData()

  return {
    data,
    source,
    isInitialLoadComplete,
    isRefreshing,
    isLiveUnavailable,
    switchSource,
    refresh,
  }
}
