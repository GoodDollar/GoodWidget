import { useEffect, useState } from 'react'

const POINTS_API_BASE = 'https://cms.superfluid.pro/points'

export interface CampaignUserPoints {
  account: string
  points: number
}

export interface CampaignUserPointsResult {
  data: CampaignUserPoints | null
  isLoading: boolean
  error: string | null
}

/** Storybook/Playwright seam for the connected-wallet balance request. */
export type CampaignUserPointsAdapter = (
  campaignId: number,
  address: string | null,
) => CampaignUserPointsResult

function formatCampaignUserPointsError(error: unknown): string {
  if (!(error instanceof Error)) return 'Unable to load your campaign points'
  return error.message
}

/**
 * Fetches only the connected wallet's points for one campaign. This is kept
 * separate from the paginated public leaderboard so the status card can stay
 * mounted and useful while the user navigates away from the leaderboard view.
 */
export function useCampaignUserPoints(
  campaignId: number,
  address: string | null,
  adapterOverride?: CampaignUserPointsAdapter,
  refreshKey = 0,
): CampaignUserPointsResult {
  const [data, setData] = useState<CampaignUserPoints | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (adapterOverride || !address || !campaignId) return

    const controller = new AbortController()
    setData(null)
    setIsLoading(true)
    setError(null)

    const url = new URL(`${POINTS_API_BASE}/balance`)
    url.searchParams.set('campaignId', String(campaignId))
    url.searchParams.set('account', address)

    fetch(url.toString(), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Campaign points request failed (${response.status})`)
        }
        return (await response.json()) as { account: string; points: number }
      })
      .then((balance) => {
        setData({ account: balance.account, points: balance.points })
        setIsLoading(false)
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
        setError(formatCampaignUserPointsError(fetchError))
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [campaignId, address, adapterOverride, refreshKey])

  if (adapterOverride) return adapterOverride(campaignId, address)
  if (!address || !campaignId) return { data: null, isLoading: false, error: null }
  return { data, isLoading, error }
}
