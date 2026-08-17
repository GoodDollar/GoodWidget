import { useEffect, useState } from 'react'
import type { ActivityType, CampaignActionDefinition } from '../widgetRuntimeContract'

const POINTS_API_BASE = 'https://cms.superfluid.pro/points'
export const LEADERBOARD_PAGE_SIZE = 10
const EVENTS_PAGE_SIZE = 100

/** `/points/campaign` response — campaign-level points totals, no SUP figures. */
export interface CampaignPointsSummary {
  campaignId: number
  name: string
  slug: string
  totalPoints: number
  memberCount: number
  totalEvents: number
  lastEventAt: string | null
  createdAt: string
}

/** One row of `/points/accounts` — the documented "campaign accounts (leaderboard)" endpoint. */
export interface CampaignPointsAccount {
  account: string
  totalPoints: number
  eventCount: number
  lastEventAt: string | null
  /** Activities with at least one positive point event for this account. */
  completedActivities: ActivityType[]
}

/** Raw `/points/accounts` row before it is enriched from `/points/events`. */
type CampaignPointsAccountResponse = Omit<CampaignPointsAccount, 'completedActivities'>

interface CampaignPointEvent {
  eventName: string
  points: number
}

interface CampaignPointEventsResponse {
  events: CampaignPointEvent[]
  pagination: CampaignPointsPagination
}

export interface CampaignPointsPagination {
  page: number
  limit: number
  totalDocs: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface CampaignLeaderboardData {
  summary: CampaignPointsSummary
  accounts: CampaignPointsAccount[]
  pagination: CampaignPointsPagination
}

export interface CampaignLeaderboardResult {
  data: CampaignLeaderboardData | null
  isLoading: boolean
  error: string | null
}

/**
 * Storybook fixtures and Playwright specs pass one of these, keyed by campaignId,
 * to render every leaderboard state
 * (loading/error/populated) deterministically instead of depending on the
 * live Points API's current standings.
 */
export type CampaignLeaderboardAdapter = (
  campaignId: number,
  page?: number,
) => CampaignLeaderboardResult

function formatCampaignLeaderboardError(error: unknown): string {
  if (!(error instanceof Error)) return 'Unable to load campaign leaderboard'
  return error.message
}

/**
 * Fetches one campaign leaderboard page from Superfluid's public Points API
 * (no auth required), then enriches its accounts with action completion from
 * the raw point-events endpoint.
 *
 * `adapterOverride`, when supplied, replaces the live fetch entirely and its
 * result is returned as-is; the effect below still runs (hook order must
 * stay stable across the two campaign tabs) but exits immediately without
 * touching the network.
 */
export function useCampaignLeaderboard(
  campaignId: number,
  actions: CampaignActionDefinition[],
  page: number,
  enabled: boolean,
  adapterOverride?: CampaignLeaderboardAdapter,
  refreshKey = 0,
): CampaignLeaderboardResult {
  const [data, setData] = useState<CampaignLeaderboardData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (adapterOverride || !enabled) return

    const controller = new AbortController()
    setData(null)
    setIsLoading(true)
    setError(null)

    const fetchJson = async <T>(path: string, params: Record<string, string>): Promise<T> => {
      const url = new URL(`${POINTS_API_BASE}${path}`)
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
      const response = await fetch(url.toString(), { signal: controller.signal })
      if (!response.ok) {
        throw new Error(`Campaign leaderboard request failed (${response.status})`)
      }
      return response.json() as Promise<T>
    }

    /**
     * The API has no bulk account × event-name endpoint. Enriching only the ten
     * accounts on the requested leaderboard page keeps the fan-out bounded.
     * Each account starts with one 100-event request and only paginates further
     * when older history is needed. We stop as soon as every activity in this
     * pool has been found.
     */
    const fetchCompletedActivities = async (account: string): Promise<ActivityType[]> => {
      const activityByEventName = new Map<string, ActivityType>()
      for (const action of actions) {
        const eventNames = action.pointsEventNames?.length
          ? action.pointsEventNames
          : [action.activity]
        for (const eventName of eventNames) activityByEventName.set(eventName, action.activity)
      }

      if (activityByEventName.size === 0) return []

      const targetActivityCount = new Set(activityByEventName.values()).size
      const completedActivities = new Set<ActivityType>()
      let eventsPage = 1
      let hasNextPage = true

      while (hasNextPage && completedActivities.size < targetActivityCount) {
        const response = await fetchJson<CampaignPointEventsResponse>('/events', {
          campaignId: String(campaignId),
          account,
          limit: String(EVENTS_PAGE_SIZE),
          page: String(eventsPage),
        })

        for (const event of response.events) {
          // Completion means the action awarded points at least once. Zero-point
          // informational events and negative corrections do not mark it done.
          if (event.points <= 0) continue
          const activity = activityByEventName.get(event.eventName)
          if (activity) completedActivities.add(activity)
        }

        hasNextPage = response.pagination.hasNextPage
        eventsPage += 1
      }

      // Preserve the action-card order rather than the API's newest-first order.
      return actions
        .map((action) => action.activity)
        .filter((activity) => completedActivities.has(activity))
    }

    Promise.all([
      fetchJson<CampaignPointsSummary>('/campaign', { campaignId: String(campaignId) }),
      fetchJson<{
        accounts: CampaignPointsAccountResponse[]
        pagination: CampaignPointsPagination
      }>('/accounts', {
        campaignId: String(campaignId),
        orderBy: 'totalPoints',
        order: 'desc',
        limit: String(LEADERBOARD_PAGE_SIZE),
        page: String(page),
      }),
    ])
      .then(async ([summary, accountsResponse]) => {
        const accounts = await Promise.all(
          accountsResponse.accounts.map(async (account) => ({
            ...account,
            completedActivities: await fetchCompletedActivities(account.account),
          })),
        )
        setData({ summary, accounts, pagination: accountsResponse.pagination })
        setIsLoading(false)
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
        setError(formatCampaignLeaderboardError(fetchError))
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [campaignId, actions, page, enabled, adapterOverride, refreshKey])

  if (adapterOverride && enabled) return adapterOverride(campaignId, page)
  if (!enabled) return { data: null, isLoading: false, error: null }
  return { data, isLoading, error }
}
