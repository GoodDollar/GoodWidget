import { useEffect, useState } from 'react'

const AIRDROP_STATUS_ENDPOINT = 'https://superfluid-airdrop.goodworker.workers.dev/'

/**
 * Every address sampled against this endpoint so far (a burn address and a
 * well-known EOA) came back "not whitelisted" — the shape returned once a
 * wallet IS whitelisted, and in particular which field represents accrued
 * points, has not been observed. Only the fields below are backed by a real
 * response; don't add speculative ones without a sampled response to match.
 */
export interface AirdropWalletData {
  claims: string
  invites: string
}

export interface AirdropStatus {
  /** Present when the whitelist check failed or the address isn't whitelisted. */
  error?: string
  /** Observed alongside `error` on some responses, absent on others. */
  walletData?: AirdropWalletData
}

export interface AirdropStatusAdapterResult {
  status: AirdropStatus | null
  isLoading: boolean
  error: string | null
}

/**
 * Mirrors AiCreditsWidgetAdapterFactory's DI seam: Storybook fixtures and
 * Playwright specs pass one of these to render every airdrop-status state
 * (loading/error/not-whitelisted/eligible) deterministically, without a real
 * wallet's live whitelist status being able to change a committed baseline
 * screenshot between runs.
 */
export type AirdropStatusAdapter = (address: string | null) => AirdropStatusAdapterResult

function formatAirdropStatusError(error: unknown): string {
  if (!(error instanceof Error)) return 'Unable to load airdrop status'
  return error.message
}

/**
 * Fetches the connected wallet's airdrop status. The effect is keyed on
 * `address` alone so it fires exactly on connect, on mount when already
 * connected, and on address change — never on unrelated re-renders.
 *
 * `adapterOverride`, when supplied, replaces the live fetch entirely and its
 * result is returned as-is; the effect below still runs (hook order must stay
 * stable) but exits immediately without touching the network.
 */
export function useAirdropStatus(address: string | null, adapterOverride?: AirdropStatusAdapter): AirdropStatusAdapterResult {
  const [status, setStatus] = useState<AirdropStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (adapterOverride) return
    if (!address) {
      setStatus(null)
      setError(null)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    fetch(`${AIRDROP_STATUS_ENDPOINT}?address=${encodeURIComponent(address)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Airdrop status request failed (${response.status})`)
        }
        return (await response.json()) as AirdropStatus
      })
      .then((data) => {
        setStatus(data)
        setIsLoading(false)
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
        setError(formatAirdropStatusError(fetchError))
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [address, adapterOverride])

  if (adapterOverride) return adapterOverride(address)
  return { status, isLoading, error }
}
