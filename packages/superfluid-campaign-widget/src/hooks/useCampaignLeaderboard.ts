import { useEffect, useState } from 'react'

const POINTS_API_BASE = 'https://cms.superfluid.pro/points'
const LEADERBOARD_PAGE_SIZE = 50

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
 * Mirrors useAirdropStatus's DI seam: Storybook fixtures and Playwright specs
 * pass one of these, keyed by campaignId, to render every leaderboard state
 * (loading/error/populated) deterministically instead of depending on the
 * live Points API's current standings.
 */
export type CampaignLeaderboardAdapter = (campaignId: number) => CampaignLeaderboardResult

function formatCampaignLeaderboardError(error: unknown): string {
  if (!(error instanceof Error)) return 'Unable to load campaign leaderboard'
  return error.message
}

/**
 * Fetches a campaign's points summary and leaderboard accounts from
 * Superfluid's public Points API (no auth required). Both requests are
 * keyed on `campaignId` alone and issued together via Promise.all since the
 * view needs both to render.
 *
 * `adapterOverride`, when supplied, replaces the live fetch entirely and its
 * result is returned as-is; the effect below still runs (hook order must
 * stay stable across the two campaign tabs) but exits immediately without
 * touching the network.
 */
export function useCampaignLeaderboard(
  campaignId: number,
  adapterOverride?: CampaignLeaderboardAdapter,
): CampaignLeaderboardResult {
  const [data, setData] = useState<CampaignLeaderboardData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (adapterOverride) return

    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    const fetchJson = async (path: string, params: Record<string, string>) => {
      const url = new URL(`${POINTS_API_BASE}${path}`)
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
      const response = await fetch(url.toString(), { signal: controller.signal })
      if (!response.ok) {
        throw new Error(`Campaign leaderboard request failed (${response.status})`)
      }
      return response.json()
    }

    Promise.all([
      fetchJson('/campaign', { campaignId: String(campaignId) }) as Promise<CampaignPointsSummary>,
      fetchJson('/accounts', {
        campaignId: String(campaignId),
        orderBy: 'totalPoints',
        order: 'desc',
        limit: String(LEADERBOARD_PAGE_SIZE),
        page: '1',
      }) as Promise<{ accounts: CampaignPointsAccount[]; pagination: CampaignPointsPagination }>,
    ])
      .then(([summary, accountsResponse]) => {
        setData({ summary, accounts: accountsResponse.accounts, pagination: accountsResponse.pagination })
        setIsLoading(false)
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
        setError(formatCampaignLeaderboardError(fetchError))
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [campaignId, adapterOverride])

  if (adapterOverride) return adapterOverride(campaignId)
  return { data, isLoading, error }
}
