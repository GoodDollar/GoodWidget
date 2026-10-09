import { useEffect, useRef, useState } from 'react'

const AIRDROP_STATUS_ENDPOINT = 'https://superfluid-airdrop.goodworker.workers.dev/'

/**
 * The GoodWorkers endpoint returns this shape for a whitelisted wallet. For a
 * wallet that is not eligible yet it returns an `error` field instead.
 */
export interface AirdropWalletData {
  claims: string
  invites: string
}

export interface AirdropStatus {
  /** Present when the whitelist check failed or the address isn't whitelisted. */
  error?: string
  walletData?: AirdropWalletData
}

export interface AirdropStatusAdapterResult {
  status: AirdropStatus | null
  isLoading: boolean
  error: string | null
}

/** Storybook/Playwright seam for the wallet-specific GoodWorkers request. */
export type AirdropStatusAdapter = (address: string | null) => AirdropStatusAdapterResult

function formatAirdropStatusError(error: unknown): string {
  if (!(error instanceof Error)) return 'Unable to load airdrop status'
  return error.message
}

/**
 * Fetches and reconciles the connected wallet's points. GoodWorkers completes
 * its point updates before returning the response, so `onSuccess` can be used
 * to invalidate public leaderboard data after the wallet's points are stored.
 *
 * The request is keyed only on `address`: it runs on initial connected load,
 * connect, and account changes, regardless of which campaign view is open.
 */
export function useAirdropStatus(
  address: string | null,
  adapterOverride?: AirdropStatusAdapter,
  onSuccess?: () => void,
): AirdropStatusAdapterResult {
  const [status, setStatus] = useState<AirdropStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onSuccessRef = useRef(onSuccess)

  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

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

    fetch(`${AIRDROP_STATUS_ENDPOINT}?address=${encodeURIComponent(address)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Airdrop status request failed (${response.status})`)
        }
        return (await response.json()) as AirdropStatus
      })
      .then((data) => {
        setStatus(data)
        setIsLoading(false)
        onSuccessRef.current?.()
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
