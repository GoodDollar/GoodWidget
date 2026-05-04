import { useEffect, useState, useRef, useCallback } from 'react'
import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { useWallet } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import { GooddollarSavingsSDK } from '@goodwidget/savings-sdk'
import type { GlobalStats, UserStats } from '@goodwidget/savings-sdk'

/** Celo mainnet chain descriptor for viem (chain id 42220) */
const CELO_CHAIN = {
  id: 42220,
  name: 'Celo',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://forno.celo.org'] },
  },
} as const

export type SavingsSdkStatus =
  | 'loading'
  | 'not_connected'
  | 'ready'
  | 'error'

export interface UseSavingsSdkResult {
  status: SavingsSdkStatus
  sdk: GooddollarSavingsSDK | null
  globalStats: GlobalStats | null
  userStats: UserStats | null
  /** Re-fetch all stats from the chain */
  refresh: () => Promise<void>
  error: string | null
}

/**
 * useSavingsSDK — creates and manages a GooddollarSavingsSDK instance
 * backed by the EIP-1193 provider from the ambient GoodWidgetProvider.
 *
 * The public client is always initialised (read-only stats work without a wallet).
 * The wallet client is initialised only when a provider is connected.
 */
export function useSavingsSDK(): UseSavingsSdkResult {
  const { address, provider } = useWallet()

  const sdkRef = useRef<GooddollarSavingsSDK | null>(null)
  // Keep a stable ref to the latest provider/address so refresh doesn't stale-close
  const providerRef = useRef(provider)
  const addressRef = useRef(address)

  const [status, setStatus] = useState<SavingsSdkStatus>('loading')
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Keep refs in sync with latest values
  useEffect(() => { providerRef.current = provider }, [provider])
  useEffect(() => { addressRef.current = address }, [address])

  // Build/update the SDK whenever the provider or address changes
  useEffect(() => {
    const publicClient = createPublicClient({
      chain: CELO_CHAIN,
      transport: http(),
    })

    let sdk: GooddollarSavingsSDK
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sdk = new GooddollarSavingsSDK(publicClient as any)
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'SDK init failed')
      return
    }

    if (provider) {
      const walletClient = createWalletClient({
        chain: CELO_CHAIN,
        transport: custom(provider as EIP1193Provider),
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sdk.setWalletClient(walletClient as any)
    }

    sdkRef.current = sdk
    setStatus(provider && address ? 'ready' : 'not_connected')
    setError(null)
  }, [provider, address])

  const refresh = useCallback(async () => {
    const sdk = sdkRef.current
    if (!sdk) return
    try {
      setError(null)
      const currentProvider = providerRef.current
      const currentAddress = addressRef.current
      const [gs, us] = await Promise.all([
        sdk.getGlobalStats(),
        currentProvider && currentAddress
          ? sdk.getUserStats().catch(() => null)
          : Promise.resolve(null),
      ])
      setGlobalStats(gs)
      setUserStats(us)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch stats')
    }
  }, [])

  // Fetch stats whenever the SDK status changes
  useEffect(() => {
    if (status === 'loading') return
    refresh()
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, [status, refresh])

  return {
    status,
    sdk: sdkRef.current,
    globalStats,
    userStats,
    refresh,
    error,
  }
}
