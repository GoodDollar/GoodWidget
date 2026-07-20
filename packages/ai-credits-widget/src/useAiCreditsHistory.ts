import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GdCreditEntry } from './backendTypes'
import { createBackendClient } from './backendClient'

export const HISTORY_PAGE_SIZE = 10
export const HISTORY_DEFAULT_FROM = '2026-01-01'
export const HISTORY_DEFAULT_TO = '2030-12-31'

export type CreditHistorySource = GdCreditEntry['source']
export type CreditHistoryStatusFilter = 'all' | GdCreditEntry['fundingStatus']

export const HISTORY_SOURCE_OPTIONS: {
  id: CreditHistorySource
  label: string
  defaultChecked: boolean
}[] = [
  { id: 'deposit', label: 'Deposit', defaultChecked: true },
  { id: 'streamUpdate', label: 'Stream update', defaultChecked: true },
  { id: 'streamRequest', label: 'Stream request', defaultChecked: true },
  { id: 'streamCron', label: 'Auto (cron)', defaultChecked: false },
]

function createDefaultSelectedSources(): Record<CreditHistorySource, boolean> {
  return Object.fromEntries(
    HISTORY_SOURCE_OPTIONS.map((option) => [option.id, option.defaultChecked]),
  ) as Record<CreditHistorySource, boolean>
}

function toIsoStartOfDay(dateValue: string): string | undefined {
  if (!dateValue || dateValue === HISTORY_DEFAULT_FROM) return undefined
  const parsed = Date.parse(`${dateValue}T00:00:00.000Z`)
  if (Number.isNaN(parsed)) return undefined
  return new Date(parsed).toISOString()
}

function toIsoEndOfDay(dateValue: string): string | undefined {
  if (!dateValue || dateValue === HISTORY_DEFAULT_TO) return undefined
  const parsed = Date.parse(`${dateValue}T23:59:59.999Z`)
  if (Number.isNaN(parsed)) return undefined
  return new Date(parsed).toISOString()
}

export interface AiCreditsHistoryState {
  selectedSources: Record<CreditHistorySource, boolean>
  statusFilter: CreditHistoryStatusFilter
  fromDate: string
  toDate: string
  entries: GdCreditEntry[]
  offset: number
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  error: string | null
  activeSources: CreditHistorySource[]
}

export interface AiCreditsHistoryActions {
  setSourceChecked: (source: CreditHistorySource, checked: boolean) => void
  setStatusFilter: (status: CreditHistoryStatusFilter) => void
  setFromDate: (value: string) => void
  setToDate: (value: string) => void
  reload: () => Promise<void>
  loadMore: () => Promise<void>
}

export interface UseAiCreditsHistoryResult {
  state: AiCreditsHistoryState
  actions: AiCreditsHistoryActions
}

export function useAiCreditsHistory(options: {
  address: string | null
  backendUrl?: string
}): UseAiCreditsHistoryResult {
  const { address, backendUrl } = options

  const [selectedSources, setSelectedSources] = useState(createDefaultSelectedSources)
  const [statusFilter, setStatusFilter] = useState<CreditHistoryStatusFilter>('all')
  const [fromDate, setFromDate] = useState(HISTORY_DEFAULT_FROM)
  const [toDate, setToDate] = useState(HISTORY_DEFAULT_TO)
  const [entries, setEntries] = useState<GdCreditEntry[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeSources = useMemo(
    () => HISTORY_SOURCE_OPTIONS.map((option) => option.id).filter((id) => selectedSources[id]),
    [selectedSources],
  )

  const loadHistory = useCallback(
    async (nextOffset: number, append: boolean) => {
      if (!address) {
        setEntries([])
        setOffset(0)
        setHasMore(false)
        setError(null)
        setLoading(false)
        setLoadingMore(false)
        return
      }

      if (activeSources.length === 0) {
        setEntries([])
        setOffset(0)
        setHasMore(false)
        setError(null)
        setLoading(false)
        setLoadingMore(false)
        return
      }

      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)

      const client = createBackendClient(backendUrl)
      const apiSource = activeSources.length === 1 ? activeSources[0] : undefined
      const fundingStatus = statusFilter === 'all' ? undefined : statusFilter

      try {
        const response = await client.getCreditHistory(address, {
          limit: HISTORY_PAGE_SIZE,
          offset: nextOffset,
          source: apiSource,
          fundingStatus,
          from: toIsoStartOfDay(fromDate),
          to: toIsoEndOfDay(toDate),
        })
        const pageItems =
          activeSources.length === 1
            ? response.items
            : response.items.filter((entry) => selectedSources[entry.source])

        setEntries((prev) => (append ? [...prev, ...pageItems] : pageItems))
        setOffset(nextOffset)
        setHasMore(response.hasMore)
      } catch (err: unknown) {
        if (!append) setEntries([])
        setHasMore(false)
        setError(err instanceof Error ? err.message : 'Unable to load credit history')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [address, backendUrl, activeSources, statusFilter, fromDate, toDate, selectedSources],
  )

  useEffect(() => {
    void loadHistory(0, false)
  }, [loadHistory])

  const setSourceChecked = useCallback((source: CreditHistorySource, checked: boolean) => {
    setSelectedSources((prev) => ({ ...prev, [source]: checked }))
  }, [])

  const reload = useCallback(async () => {
    await loadHistory(0, false)
  }, [loadHistory])

  const loadMore = useCallback(async () => {
    await loadHistory(offset + HISTORY_PAGE_SIZE, true)
  }, [loadHistory, offset])

  return {
    state: {
      selectedSources,
      statusFilter,
      fromDate,
      toDate,
      entries,
      offset,
      hasMore,
      loading,
      loadingMore,
      error,
      activeSources,
    },
    actions: {
      setSourceChecked,
      setStatusFilter,
      setFromDate,
      setToDate,
      reload,
      loadMore,
    },
  }
}
