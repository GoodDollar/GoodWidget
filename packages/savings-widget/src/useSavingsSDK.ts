import { useState, useEffect, useRef, useCallback } from 'react'
import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { celo } from 'viem/chains'
import { useWallet } from '@goodwidget/core'
import {
  GooddollarSavingsSDK,
  formatGDollar,
  toEtherNumber,
  parseGDollar,
} from '@goodwidget/savings-sdk'
import type { GlobalStats, UserStats } from '@goodwidget/savings-sdk'

const CELO_CHAIN_ID = 42220

export type SavingsTab = 'stake' | 'unstake'

export interface SavingsSDKState {
  /** The initialized SDK instance (may be read-only if wallet is not connected) */
  sdk: GooddollarSavingsSDK | null
  /** Whether the connected wallet is on the Celo network */
  isOnCelo: boolean
  /** Global staking stats (available without wallet) */
  globalStats: GlobalStats | null
  /** User-specific staking stats (available only when connected) */
  userStats: UserStats | null
  /** True while global or user stats are loading */
  loading: boolean
  /** Error string if any operation failed */
  error: string | null
  /** Refresh all stats from chain */
  refresh: () => Promise<void>
  /** Stake G$ tokens */
  stake: (amount: string, onHash?: (hash: `0x${string}`) => void) => Promise<boolean>
  /** Unstake G$ tokens */
  unstake: (amount: string, onHash?: (hash: `0x${string}`) => void) => Promise<boolean>
  /** Claim accumulated rewards */
  claimReward: (onHash?: (hash: `0x${string}`) => void) => Promise<boolean>
}

/**
 * useSavingsSDK — bridges GoodWidget's EIP-1193 wallet context to the GooddollarSavingsSDK.
 *
 * - Creates a viem PublicClient for Celo mainnet (always, for read-only access to global stats).
 * - Creates a viem WalletClient from the detected EIP-1193 provider when the wallet is connected
 *   and the chain is Celo mainnet.
 * - Exposes stake/unstake/claimReward actions and refreshable state.
 */
export function useSavingsSDK(): SavingsSDKState {
  const { provider, address, chainId } = useWallet()

  const [sdk, setSdk] = useState<GooddollarSavingsSDK | null>(null)
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOnCelo = chainId === CELO_CHAIN_ID

  // Stable public client for Celo (always needed for reads, even without a wallet)
  const publicClientRef = useRef(
    createPublicClient({ chain: celo, transport: http() }),
  )

  // Re-create the SDK whenever the provider or chain changes
  useEffect(() => {
    const publicClient = publicClientRef.current
    try {
      if (provider && isOnCelo) {
        const walletClient = createWalletClient({
          chain: celo,
          transport: custom(provider),
        })
        setSdk(new GooddollarSavingsSDK(publicClient, walletClient))
      } else {
        // Read-only: global stats only
        setSdk(new GooddollarSavingsSDK(publicClient))
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSdk(null)
    }
  }, [provider, isOnCelo])

  const refresh = useCallback(async () => {
    if (!sdk) return
    setLoading(true)
    setError(null)
    try {
      const global = await sdk.getGlobalStats()
      setGlobalStats(global)

      if (address && isOnCelo) {
        const user = await sdk.getUserStats(address as `0x${string}`)
        setUserStats(user)
      } else {
        setUserStats(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [sdk, address, isOnCelo])

  // Refresh whenever the SDK or address changes
  useEffect(() => {
    if (sdk) {
      void refresh()
    }
  }, [sdk, address, refresh])

  const stake = useCallback(async (
    amountStr: string,
    onHash?: (hash: `0x${string}`) => void,
  ): Promise<boolean> => {
    if (!sdk) {
      setError('SDK not initialized')
      return false
    }
    setError(null)
    try {
      const amount = parseGDollar(amountStr)
      const receipt = await sdk.stake(amount, onHash)
      if (receipt.status === 'success') {
        await refresh()
        return true
      }
      setError('Transaction reverted')
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }, [sdk, refresh])

  const unstake = useCallback(async (
    amountStr: string,
    onHash?: (hash: `0x${string}`) => void,
  ): Promise<boolean> => {
    if (!sdk) {
      setError('SDK not initialized')
      return false
    }
    setError(null)
    try {
      const amount = parseGDollar(amountStr)
      const receipt = await sdk.unstake(amount, onHash)
      if (receipt.status === 'success') {
        await refresh()
        return true
      }
      setError('Transaction reverted')
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }, [sdk, refresh])

  const claimReward = useCallback(async (onHash?: (hash: `0x${string}`) => void): Promise<boolean> => {
    if (!sdk) {
      setError('SDK not initialized')
      return false
    }
    setError(null)
    try {
      const receipt = await sdk.claimReward(onHash)
      if (receipt.status === 'success') {
        await refresh()
        return true
      }
      setError('Transaction reverted')
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }, [sdk, refresh])

  return {
    sdk,
    isOnCelo,
    globalStats,
    userStats,
    loading,
    error,
    refresh,
    stake,
    unstake,
    claimReward,
  }
}

export { formatGDollar, toEtherNumber, parseGDollar }

