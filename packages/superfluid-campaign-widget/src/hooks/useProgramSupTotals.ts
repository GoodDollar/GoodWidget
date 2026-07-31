import { useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import type { Address } from 'viem'

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
 * totalMembers: current members with more than zero units in the pool.
 * flowRate: current ongoing distribution rate (wei/second); 0 for instant-only pools.
 * updatedAtTimestamp: Unix seconds of the last on-chain update to this pool.
 */
const GET_POOL_TOTALS_QUERY = `
  query GetPoolTotals($id: ID!) {
    pool(id: $id) {
      totalAmountDistributedUntilUpdatedAt
      totalMembers
      flowRate
      updatedAtTimestamp
    }
  }
`

interface SubgraphPoolFields {
  totalAmountDistributedUntilUpdatedAt: string
  totalMembers: number
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
  /** Current pool members with more than zero units. */
  totalMembers: number
  /**
   * Historical public name retained for compatibility. This is the amount the
   * pool has distributed so far, including flow accrued since its last update.
   */
  totalClaimed: number
}

export interface ProgramSupTotalsResult {
  /** Null when the campaign has no on-chain program registered yet (a normal,
   *  handled case — e.g. Ecosystem actions/614 as of Season 6 launch — not an error). */
  data: ProgramSupTotals | null
  isLoading: boolean
  error: string | null
}

/**
 * Mirrors useCampaignLeaderboard's DI seam: Storybook fixtures and Playwright
 * specs pass one of these, keyed by campaignId, to render distribution and
 * member totals deterministically instead of depending on live pool state.
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
 * totalAllocated is supplied alongside the campaign content. It represents
 * the total SUP committed to this program and is not a live subgraph value.
 *
 * Returns null (→ RewardPoolSection falls back to mock data) when:
 * - The integrator did not pass a pool address for this campaignId, OR
 * - The subgraph returns no pool for the configured address.
 *
 * `adapterOverride`, when supplied, replaces the live fetch entirely and its
 * result is returned as-is; the effect still runs (hook order must stay stable)
 * but exits immediately without touching the network.
 */
export function useProgramSupTotals(
  campaignId: number,
  poolAddress: Address | undefined,
  totalAllocated: number,
  adapterOverride?: ProgramSupTotalsAdapter,
): ProgramSupTotalsResult {
  const [data, setData] = useState<ProgramSupTotals | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (adapterOverride) return

    if (!poolAddress) {
      // A Points API campaign id cannot identify a GDA pool in the protocol
      // subgraph. The public pool address must be supplied by the integrator.
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
        variables: { id: poolAddress.toLowerCase() },
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
          totalAllocated,
          totalMembers: pool.totalMembers,
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
  }, [campaignId, poolAddress, totalAllocated, adapterOverride])

  if (adapterOverride) return adapterOverride(campaignId)
  return { data, isLoading, error }
}
