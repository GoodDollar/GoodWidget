import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GdCreditEntry } from './backendTypes'
import { createBackendClient } from './backendClient'
import type { AiCreditsBackendClient } from './backendClient'
import type { AiCreditsWidgetEnvironment } from './widgetRuntimeContract'

export const HISTORY_PAGE_SIZE = 10
export const HISTORY_LOOKBACK_DAYS = 90
const BUYER_FILTER_FILL_MAX_PAGES = 8

export type CreditHistorySource = GdCreditEntry['source']
export type CreditHistoryStatusFilter = 'all' | GdCreditEntry['fundingStatus']

export const BUYER_FILTER_ALL = 'all' as const
export type SignerAddressFilter = typeof BUYER_FILTER_ALL | string

export const HISTORY_SOURCE_OPTIONS: {
  id: CreditHistorySource
  label: string
  defaultChecked: boolean
}[] = [
  { id: 'deposit', label: 'Deposit', defaultChecked: true },
  { id: 'streamUpdate', label: 'Stream update', defaultChecked: true },
  { id: 'streamRequest', label: 'Stream credit', defaultChecked: true },
  { id: 'streamCron', label: 'Stream credit', defaultChecked: true },
]

export function formatHistoryDateInput(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function getLast90DaysRange(now = new Date()): { from: string; to: string } {
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - HISTORY_LOOKBACK_DAYS)
  return {
    from: formatHistoryDateInput(from),
    to: formatHistoryDateInput(to),
  }
}

function createDefaultSelectedSources(): Record<CreditHistorySource, boolean> {
  return Object.fromEntries(
    HISTORY_SOURCE_OPTIONS.map((option) => [option.id, option.defaultChecked]),
  ) as Record<CreditHistorySource, boolean>
}

function toIsoStartOfDay(dateValue: string): string | undefined {
  if (!dateValue) return undefined
  const parsed = Date.parse(`${dateValue}T00:00:00.000Z`)
  if (Number.isNaN(parsed)) return undefined
  return new Date(parsed).toISOString()
}

function toIsoEndOfDay(dateValue: string): string | undefined {
  if (!dateValue) return undefined
  const parsed = Date.parse(`${dateValue}T23:59:59.999Z`)
  if (Number.isNaN(parsed)) return undefined
  return new Date(parsed).toISOString()
}

function matchesSignerFilter(entry: GdCreditEntry, filter: SignerAddressFilter): boolean {
  if (filter === BUYER_FILTER_ALL) return true
  return entry.buyerAddress?.toLowerCase() === filter.toLowerCase()
}

export interface AiCreditsHistoryState {
  selectedSources: Record<CreditHistorySource, boolean>
  statusFilter: CreditHistoryStatusFilter
  signerAddressFilter: SignerAddressFilter
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
  setSignerAddressFilter: (value: SignerAddressFilter) => void
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
  defaultSignerFilter?: SignerAddressFilter
  environment?: AiCreditsWidgetEnvironment
  backendClient?: AiCreditsBackendClient
  onSignersDiscovered?: (addresses: string[]) => void
}): UseAiCreditsHistoryResult {
  const {
    address,
    backendUrl,
    defaultSignerFilter = BUYER_FILTER_ALL,
    environment = 'production',
    backendClient,
    onSignersDiscovered,
  } = options
  const defaultRange = useMemo(() => getLast90DaysRange(), [])

  const [selectedSources, setSelectedSources] = useState(createDefaultSelectedSources)
  const [statusFilter, setStatusFilter] = useState<CreditHistoryStatusFilter>('all')
  const [signerAddressFilter, setSignerAddressFilter] = useState<SignerAddressFilter>(defaultSignerFilter)
  const [fromDate, setFromDate] = useState(defaultRange.from)
  const [toDate, setToDate] = useState(defaultRange.to)
  const [entries, setEntries] = useState<GdCreditEntry[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSignerAddressFilter(defaultSignerFilter)
  }, [defaultSignerFilter])

  const activeSources = useMemo(
    () => HISTORY_SOURCE_OPTIONS.map((option) => option.id).filter((id) => selectedSources[id]),
    [selectedSources],
  )

  const loadHistory = useCallback(
    async (nextOffset: number, append: boolean) => {
      if (!address) {
        setEntries((prev) => (prev.length === 0 ? prev : []))
        setOffset((prev) => (prev === 0 ? prev : 0))
        setHasMore((prev) => (prev ? false : prev))
        setError((prev) => (prev === null ? prev : null))
        setLoading((prev) => (prev ? false : prev))
        setLoadingMore((prev) => (prev ? false : prev))
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

      const client = backendClient ?? createBackendClient(backendUrl)
      const apiSource = activeSources.length === 1 ? activeSources[0] : undefined
      const fundingStatus = statusFilter === 'all' ? undefined : statusFilter
      const filterBySigner = signerAddressFilter !== BUYER_FILTER_ALL

      try {
        const collected: GdCreditEntry[] = []
        let cursor = nextOffset
        let apiHasMore = true
        let pages = 0

        while (
          pages < BUYER_FILTER_FILL_MAX_PAGES &&
          collected.length < HISTORY_PAGE_SIZE &&
          apiHasMore
        ) {
          const response = await client.getCreditHistory(address, {
            limit: HISTORY_PAGE_SIZE,
            offset: cursor,
            source: apiSource,
            fundingStatus,
            from: toIsoStartOfDay(fromDate),
            to: toIsoEndOfDay(toDate),
          })

          const sourceFiltered =
            activeSources.length === 1
              ? response.items
              : response.items.filter((entry) => selectedSources[entry.source])

          const discoveredSigners = sourceFiltered
            .map((entry) => entry.buyerAddress)
            .filter((value): value is string => Boolean(value))
          if (discoveredSigners.length > 0) {
            onSignersDiscovered?.(discoveredSigners)
          }

          const signerFiltered = sourceFiltered.filter((entry) =>
            matchesSignerFilter(entry, signerAddressFilter),
          )
          collected.push(...signerFiltered)

          apiHasMore = response.hasMore
          cursor = response.offset + response.limit
          pages += 1

          if (!filterBySigner) break
        }

        setEntries((prev) => (append ? [...prev, ...collected] : collected))
        setOffset(cursor)
        setHasMore(apiHasMore)
      } catch (err: unknown) {
        if (!append) setEntries([])
        setHasMore(false)
        setError(err instanceof Error ? err.message : 'Unable to load credit history')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [
      address,
      backendUrl,
      environment,
      backendClient,
      activeSources,
      statusFilter,
      signerAddressFilter,
      fromDate,
      toDate,
      selectedSources,
      onSignersDiscovered,
    ],
  )

  useEffect(() => {
    void loadHistory(0, false)
  }, [loadHistory])

  const setSourceChecked = useCallback((source: CreditHistorySource, checked: boolean) => {
    setSelectedSources((prev) => {
      if (source === 'streamRequest' || source === 'streamCron') {
        return { ...prev, streamRequest: checked, streamCron: checked }
      }
      return { ...prev, [source]: checked }
    })
  }, [])

  const reload = useCallback(async () => {
    await loadHistory(0, false)
  }, [loadHistory])

  const loadMore = useCallback(async () => {
    await loadHistory(offset, true)
  }, [loadHistory, offset])

  return {
    state: {
      selectedSources,
      statusFilter,
      signerAddressFilter,
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
      setSignerAddressFilter,
      setFromDate,
      setToDate,
      reload,
      loadMore,
    },
  }
}
