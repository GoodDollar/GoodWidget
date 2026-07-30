import { useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import { CAMPAIGN_GDA_POOL_CONFIG } from './campaignPoolConfig'

/**
 * Superfluid protocol-v1 subgraph for Base mainnet.
 * Public GraphQL endpoint — no API key or CORS restriction for browser queries.
 * Replaces claim.superfluid.org/api/programs which is CORS-protected.
 */
const SUPERFLUID_BASE_SUBGRAPH = 'https://base-mainnet.subgraph.x.superfluid.dev/'

/**
 * Pool entity fields needed for SUP distribution totals.
 * totalAmountDistributedUntilUpdatedAt: cumulative amount distributed to all members
 *   up to the last on-chain state change (instant + flow, in wei).
 * flowRate: current ongoing distribution rate (wei/second); 0 for instant-only pools.
 * updatedAtTimestamp: Unix seconds of the last on-chain update to this pool.
 */
const GET_POOL_TOTALS_QUERY = `
  query GetPoolTotals($id: ID!) {
    pool(id: $id) {
      totalAmountDistributedUntilUpdatedAt
      flowRate
      updatedAtTimestamp
    }
  }
`

interface SubgraphPoolFields {
  totalAmountDistributedUntilUpdatedAt: string
  flowRate: string
  updatedAtTimestamp: string
}

interface SubgraphResponse {
  data?: { pool: SubgraphPoolFields | null }
  errors?: Array<{ message: string }>
}

/** Human-readable SUP amounts (already converted from 18-decimal wei). */
export interface ProgramSupTotals {
  totalAllocated: number
  totalClaimed: number
}

export interface ProgramSupTotalsResult {
  /** Null when the campaign has no on-chain program registered yet (a normal,
   *  handled case — e.g. Ecosystem funding actions/614 as of Season 6 launch — not an error). */
  data: ProgramSupTotals | null
  isLoading: boolean
  error: string | null
}

/**
 * Mirrors useCampaignLeaderboard's DI seam: Storybook fixtures and Playwright
 * specs pass one of these, keyed by campaignId, to render the SUP-totals
 * progress bar deterministically instead of depending on the live programs
 * list (whose funding state, and therefore totals, changes over time).
 */
export type ProgramSupTotalsAdapter = (campaignId: number) => ProgramSupTotalsResult

function formatProgramSupTotalsError(error: unknown): string {
  if (!(error instanceof Error)) return 'Unable to load SUP totals'
  return error.message
}

/**
 * Fetches a campaign pool's distribution totals from the Superfluid protocol-v1
 * subgraph on Base mainnet (https://base-mainnet.subgraph.x.superfluid.dev/).
 *
 * This replaces the previous claim.superfluid.org/api/programs fetch, which is a
 * tRPC endpoint protected by CORS and therefore not callable from browser contexts.
 *
 * totalClaimed is derived from pool.totalAmountDistributedUntilUpdatedAt (the
 * cumulative amount the pool has distributed to its members) plus any in-flight
 * streaming (flowRate × seconds elapsed since the last on-chain update), giving
 * a live approximation without requiring an additional RPC call.
 *
 * totalAllocated is the static campaign budget stored in CAMPAIGN_GDA_POOL_CONFIG —
 * it represents the total SUP committed to this program by Superfluid and does not
 * change unless the program budget is explicitly updated.
 *
 * Returns null (→ RewardPoolSection falls back to mock data) when:
 * - No pool address has been configured for this campaignId yet, OR
 * - The subgraph returns no pool for the configured address.
 *
 * `adapterOverride`, when supplied, replaces the live fetch entirely and its
 * result is returned as-is; the effect still runs (hook order must stay stable)
 * but exits immediately without touching the network.
 */
export function useProgramSupTotals(campaignId: number, adapterOverride?: ProgramSupTotalsAdapter): ProgramSupTotalsResult {
  const [data, setData] = useState<ProgramSupTotals | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (adapterOverride) return

    const poolConfig = CAMPAIGN_GDA_POOL_CONFIG[campaignId]
    if (!poolConfig?.poolAddress) {
      // No pool registered for this campaign yet — return null so the UI falls
      // back to the pool's static placeholder figures.
      setData(null)
      setIsLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    fetch(SUPERFLUID_BASE_SUBGRAPH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: GET_POOL_TOTALS_QUERY,
        variables: { id: poolConfig.poolAddress.toLowerCase() },
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Superfluid subgraph request failed (${response.status})`)
        }
        return (await response.json()) as SubgraphResponse
      })
      .then((json) => {
        if (json.errors?.length) {
          throw new Error(json.errors.map((e) => e.message).join('; '))
        }
        const pool = json.data?.pool
        if (!pool) {
          // Address configured but pool not found in subgraph — treat as no program.
          setData(null)
          setIsLoading(false)
          return
        }

        // totalAmountDistributedUntilUpdatedAt is the cumulative total distributed
        // from this pool to all members up to the last on-chain state change.
        // For streaming pools (flowRate > 0), add in-flight tokens to get the live total.
        const distributedWei = BigInt(pool.totalAmountDistributedUntilUpdatedAt)
        const flowRate = BigInt(pool.flowRate)
        const updatedAt = BigInt(pool.updatedAtTimestamp)
        const nowSeconds = BigInt(Math.floor(Date.now() / 1000))
        const inFlightWei = flowRate > 0n ? flowRate * (nowSeconds - updatedAt) : 0n

        setData({
          totalAllocated: poolConfig.totalAllocated,
          totalClaimed: Number(formatUnits(distributedWei + inFlightWei, 18)),
        })
        setIsLoading(false)
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
        setError(formatProgramSupTotalsError(fetchError))
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [campaignId, adapterOverride])

  if (adapterOverride) return adapterOverride(campaignId)
  return { data, isLoading, error }
}
