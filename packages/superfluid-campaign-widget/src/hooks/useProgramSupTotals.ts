import { useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import type { Address } from 'viem'

const PROGRAMS_ENDPOINT = 'https://claim.superfluid.org/api/programs'

/** Human-readable SUP amounts (already converted from 18-decimal wei). */
export interface ProgramSupTotals {
  totalAllocated: number
  totalClaimed: number
  /** Current pool members with more than zero units, as returned by the programs API. */
  totalMembers: number
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
 * GET /api/programs is a tRPC endpoint, so the body is wrapped in superjson's
 * `{json, meta}` envelope — the array of programs lives under `.json`. This
 * is the first superjson-wrapped fetch in this codebase; only the fields this
 * hook reads are typed here, the full payload carries far more marketing copy.
 */
interface SuperfluidProgramsResponse {
  json: Array<{
    program?: {
      id: number
      onchainInfo?: {
        totalAllocated: string
        totalClaimed: string
        totalMembers: number
      }
    }
  }>
}

/**
 * Fetches every Superfluid SUP reward program and looks up the one matching
 * `campaignId`, converting its on-chain wei totals to human-readable SUP.
 *
 * `poolAddress` is accepted for interface compatibility with callers that also
 * support subgraph-based lookups, but is not used by this endpoint (the programs
 * API indexes by campaign id directly).
 *
 * `totalAllocated` is accepted as a pass-through param but the live value is
 * taken from the API response when available; the param is ignored.
 *
 * `adapterOverride`, when supplied, replaces the live fetch entirely and its
 * result is returned as-is; the effect below still runs (hook order must stay
 * stable across the two pool sections) but exits immediately without
 * touching the network.
 */
export function useProgramSupTotals(
  campaignId: number,
  _poolAddress: Address | undefined,
  _totalAllocated: number,
  adapterOverride?: ProgramSupTotalsAdapter,
): ProgramSupTotalsResult {
  const [data, setData] = useState<ProgramSupTotals | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (adapterOverride) return

    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    fetch(PROGRAMS_ENDPOINT, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`SUP program totals request failed (${response.status})`)
        }
        const envelope = (await response.json()) as SuperfluidProgramsResponse
        return envelope.json
      })
      .then((programs) => {
        const onchainInfo = programs.find((entry) => entry.program?.id === campaignId)?.program
          ?.onchainInfo

        setData(
          onchainInfo
            ? {
                totalAllocated: Number(formatUnits(BigInt(onchainInfo.totalAllocated), 18)),
                totalClaimed: Number(formatUnits(BigInt(onchainInfo.totalClaimed), 18)),
                totalMembers: onchainInfo.totalMembers,
              }
            : null,
        )
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
