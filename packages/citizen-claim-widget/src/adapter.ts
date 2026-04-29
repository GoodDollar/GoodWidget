import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '@goodwidget/core'
import { createPublicClient, createWalletClient, custom, formatUnits, http, type Chain } from 'viem'
import {
  ClaimSDK,
  IdentitySDK,
  citizenSdkCapabilities,
  checkGenericDailyStats,
  checkGenericEntitlement,
  isSupportedChain,
  SupportedChains,
  CHAIN_DECIMALS,
} from '@goodsdks/citizen-sdk'
import type {
  CitizenClaimWidgetAdapterActions,
  CitizenClaimWidgetAdapterResult,
  CitizenClaimWidgetAdapterState,
  CitizenClaimWidgetEnvironment,
  CitizenClaimWidgetStatus,
} from './widgetRuntimeContract'

// ---------------------------------------------------------------------------
// Minimal viem chain descriptors for the 3 chains supported by citizen-sdk.
// These are required so walletClient.chain?.id resolves correctly for the SDK.
// ---------------------------------------------------------------------------
const CHAIN_CONFIGS: Record<number, Chain> = {
  [SupportedChains.FUSE]: {
    id: SupportedChains.FUSE,
    name: 'Fuse',
    nativeCurrency: { name: 'Fuse', symbol: 'FUSE', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.fuse.io'] } },
  } as Chain,
  [SupportedChains.CELO]: {
    id: SupportedChains.CELO,
    name: 'Celo',
    nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
    rpcUrls: { default: { http: ['https://forno.celo.org'] } },
  } as Chain,
  [SupportedChains.XDC]: {
    id: SupportedChains.XDC,
    name: 'XDC Network',
    nativeCurrency: { name: 'XDC', symbol: 'XDC', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.ankr.com/xdc'] } },
  } as Chain,
}

const SUPPORTED_CHAINS = citizenSdkCapabilities.chains
const AVAILABLE_ENVIRONMENTS = citizenSdkCapabilities.environments

export interface UseCitizenClaimAdapterOptions {
  environment?: CitizenClaimWidgetEnvironment
  /**
   * URL to redirect the user to after face-verification completes.
   * Defaults to the current page URL if running in a browser.
   */
  rdu?: string
}

type CitizenEnvironment = 'production' | 'staging' | 'development'

/**
 * Core adapter hook: bridges @goodsdks/citizen-sdk to GoodWidget state/actions.
 *
 * Runtime path:
 *   host provider → GoodWidgetProvider → useWallet() → this adapter → citizen-sdk
 *
 * The adapter:
 * 1. Reads wallet state from useWallet() (injected by GoodWidgetProvider)
 * 2. Creates viem public/wallet clients from the EIP1193 provider
 * 3. Instantiates IdentitySDK + ClaimSDK from those clients
 * 4. Manages the CitizenClaimWidgetStatus state machine
 * 5. Exposes typed actions: connect, verify, claim, refresh, switchChain
 *
 * State transitions (mirrors GoodWalletV2 ClaimView.tsx logic):
 *   not_connected → [connect] → loading
 *   loading → not_whitelisted | eligible | already_claimed | error
 *   not_whitelisted → [verify] → (external FV flow) → loading after return
 *   eligible → [claim] → claiming → success | error
 *   error → [refresh] → loading
 */
export function useCitizenClaimAdapter(
  options: UseCitizenClaimAdapterOptions = {},
): CitizenClaimWidgetAdapterResult {
  const { address, chainId, isConnected, provider, connect } = useWallet()

  // Normalise env string to one of the SDK-declared runtime environments.
  const env = (
    options.environment && AVAILABLE_ENVIRONMENTS.includes(options.environment)
      ? options.environment
      : 'production'
  ) as CitizenEnvironment

  // Whether the connected wallet is on a chain supported by citizen-sdk
  const onSupportedChain = chainId !== null && isSupportedChain(chainId)

  const [status, setStatus] = useState<CitizenClaimWidgetStatus>(
    isConnected ? 'loading' : 'not_connected',
  )
  const [amount, setAmount] = useState<string | null>(null)
  const [nextClaimTime, setNextClaimTime] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [claimablesByChain, setClaimablesByChain] = useState<
    Array<{ chainId: number; amount: string }>
  >([])
  const [dailyStats, setDailyStats] = useState({
    dailyNumberOfClaimers: 0,
    dailyClaimedAmount: 0,
  })

  // Guard against state updates after the component unmounts
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Client factory — creates viem clients from the EIP1193 provider.
  // Returns null when any required wallet state is missing.
  // ---------------------------------------------------------------------------
  const createClientsForChain = useCallback(
    (targetChainId: number) => {
      if (!provider || !address) return null
      const chain = CHAIN_CONFIGS[targetChainId]
      if (!chain) return null
      const transport = custom(provider as Parameters<typeof custom>[0])
      const publicClient = createPublicClient({ chain, transport })
      const walletClient = createWalletClient({
        account: address as `0x${string}`,
        chain,
        transport,
      })
      return { publicClient, walletClient }
    },
    [provider, address],
  )

  const createClients = useCallback(() => {
    if (!chainId) return null
    if (!provider || !address) return null
    const chain = CHAIN_CONFIGS[chainId]
    if (!chain) return null
    // chain may be undefined for unsupported networks; the SDK will throw clearly.
    const transport = custom(provider as Parameters<typeof custom>[0])
    const publicClient = createPublicClient({ chain, transport })
    const walletClient = createWalletClient({
      account: address as `0x${string}`,
      chain,
      transport,
    })
    return { publicClient, walletClient }
  }, [provider, address, chainId])

  // ---------------------------------------------------------------------------
  // SDK factory — wraps viem clients in IdentitySDK + ClaimSDK instances.
  // ---------------------------------------------------------------------------
  const createSdkInstances = useCallback(
    (clients: ReturnType<typeof createClients>) => {
      if (!clients || !address) return null
      const { publicClient, walletClient } = clients
      const identitySDK = new IdentitySDK({ publicClient, walletClient, env })
      const claimSDK = new ClaimSDK({
        account: address as `0x${string}`,
        publicClient,
        walletClient,
        identitySDK,
        env,
        // Return URL used by the GoodID face-verification redirect flow
        rdu: options.rdu ?? (typeof window !== 'undefined' ? window.location.href : ''),
      })
      return { identitySDK, claimSDK }
    },
    [address, env, options.rdu],
  )

  const createSdkInstancesForChain = useCallback(
    (targetChainId: number) => {
      const clients = createClientsForChain(targetChainId)
      if (!clients || !address) return null
      const { publicClient, walletClient } = clients
      const identitySDK = new IdentitySDK({ publicClient, walletClient, env })
      const claimSDK = new ClaimSDK({
        account: address as `0x${string}`,
        publicClient,
        walletClient,
        identitySDK,
        env,
        rdu: options.rdu ?? (typeof window !== 'undefined' ? window.location.href : ''),
      })
      return { identitySDK, claimSDK }
    },
    [createClientsForChain, address, env, options.rdu],
  )

  /**
   * Collects claimable UBI amounts for all citizen-sdk supported chains.
   * This mirrors GoodWalletV2's claim breakdown model (eligible amounts per chain).
   */
  const loadClaimablesByChain = useCallback(async (): Promise<void> => {
    const eligible: Array<{ chainId: number; amount: string }> = []

    await Promise.all(
      SUPPORTED_CHAINS.map(async (supportedChainId) => {
        try {
          const chain = CHAIN_CONFIGS[supportedChainId]
          const rpcUrl = chain.rpcUrls.default.http[0]
          if (!rpcUrl) return
          const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
          const entitlement = await checkGenericEntitlement({
            publicClient,
            chainId: supportedChainId,
            env,
          })
          if (entitlement <= 0n) return

          const decimals = CHAIN_DECIMALS[supportedChainId] ?? 18
          eligible.push({
            chainId: supportedChainId,
            amount: formatUnits(entitlement, decimals),
          })
        } catch {
          // Keep per-chain reads best-effort: one RPC/SDK failure should not block the widget.
        }
      }),
    )

    if (!mountedRef.current) return
    eligible.sort((a, b) => b.chainId - a.chainId)
    setClaimablesByChain(eligible)
  }, [env])

  const loadDailyStats = useCallback(async (): Promise<void> => {
    let maxClaimers = 0
    let totalClaimed = 0

    await Promise.all(
      SUPPORTED_CHAINS.map(async (supportedChainId) => {
        try {
          const chain = CHAIN_CONFIGS[supportedChainId]
          const rpcUrl = chain.rpcUrls.default.http[0]
          if (!rpcUrl) return
          const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
          const stats = await checkGenericDailyStats({
            publicClient,
            chainId: supportedChainId,
            env,
          })
          const claimers = Number(stats.claimers)
          if (claimers > maxClaimers) maxClaimers = claimers
          const decimals = CHAIN_DECIMALS[supportedChainId] ?? 18
          totalClaimed += Number(formatUnits(stats.amount, decimals))
        } catch {
          // Best effort aggregation.
        }
      }),
    )

    if (!mountedRef.current) return
    setDailyStats({
      dailyNumberOfClaimers: maxClaimers,
      dailyClaimedAmount: totalClaimed,
    })
  }, [env])

  // ---------------------------------------------------------------------------
  // loadClaimStatus — primary refresh action.
  // Calls getWalletClaimStatus() and maps the SDK result to widget status.
  // ---------------------------------------------------------------------------
  const loadClaimStatus = useCallback(async () => {
    if (!isConnected || !address) {
      await loadClaimablesByChain()
      await loadDailyStats()
      setStatus('not_connected')
      return
    }

    // Always refresh per-chain claimables for a connected wallet, even if the
    // currently active chain is unsupported. This keeps the cross-chain
    // breakdown visible while prompting for network switching.
    await loadClaimablesByChain()
    await loadDailyStats()

    if (!onSupportedChain) {
      // Wallet connected but on an unsupported chain — surface switch_chain action
      setStatus('not_connected')
      return
    }

    setStatus('loading')
    setError(null)

    const clients = createClients()
    if (!clients) {
      setStatus('not_connected')
      return
    }
    const sdk = createSdkInstances(clients)
    if (!sdk) {
      setStatus('not_connected')
      return
    }

    try {
      const walletStatus = await sdk.claimSDK.getWalletClaimStatus()
      if (!mountedRef.current) return

      if (walletStatus.status === 'not_whitelisted') {
        // User needs face-verification before claiming
        setStatus('not_whitelisted')
        setAmount(null)
      } else if (walletStatus.status === 'can_claim') {
        // User is whitelisted and has unclaimed UBI
        setStatus('eligible')
        const decimals = CHAIN_DECIMALS[chainId as SupportedChains] ?? 18
        setAmount(formatUnits(walletStatus.entitlement, decimals))
      } else {
        // User is whitelisted but has already claimed for this period
        setStatus('already_claimed')
        setNextClaimTime(walletStatus.nextClaimTime ?? null)
        setAmount(null)
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to load claim status')
    }
  }, [
    isConnected,
    address,
    onSupportedChain,
    chainId,
    createClients,
    createSdkInstances,
    loadClaimablesByChain,
    loadDailyStats,
  ])

  // Auto-refresh claim status whenever wallet connection or chain changes
  useEffect(() => {
    void loadClaimStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, chainId])

  // ---------------------------------------------------------------------------
  // handleClaim — executes the UBI claim transaction via ClaimSDK.
  // Transitions: eligible → claiming → success | error
  // ---------------------------------------------------------------------------
  const claimOnChain = useCallback(
    async (targetChainId: number): Promise<unknown> => {
      if (!provider) throw new Error('No wallet provider available')
      if (!address) throw new Error('Wallet not connected')

      if (!isSupportedChain(targetChainId)) {
        throw new Error(`Unsupported chain for citizen-sdk: ${targetChainId}`)
      }

      setStatus('claiming')
      setError(null)

      // Ensure the wallet is on the target chain before signing.
      await (
        provider as {
          request: (args: { method: string; params: unknown[] }) => Promise<unknown>
        }
      ).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      })

      const sdk = createSdkInstancesForChain(targetChainId)
      if (!sdk) throw new Error('Unable to initialize SDK clients for target chain')

      return sdk.claimSDK.claim()
    },
    [provider, address, createSdkInstancesForChain],
  )

  const handleClaim = useCallback(async (): Promise<unknown> => {
    if (!chainId) throw new Error('No active chain selected')

    setStatus('claiming')
    setError(null)

    try {
      const receipt = await claimOnChain(chainId)
      if (!mountedRef.current) return receipt
      await loadClaimStatus()
      return receipt
    } catch (err: unknown) {
      if (!mountedRef.current) throw err
      const message = err instanceof Error ? err.message : 'Claim failed'
      setStatus('error')
      setError(message)
      throw err
    }
  }, [chainId, claimOnChain, loadClaimStatus])

  // ---------------------------------------------------------------------------
  // handleVerify — initiates the GoodID face-verification flow.
  // Opens in a new tab; the page reloads/redirects back when complete.
  // ---------------------------------------------------------------------------
  const handleVerify = useCallback(async (): Promise<void> => {
    const clients = createClients()
    const sdk = createSdkInstances(clients)
    if (!sdk) throw new Error('Wallet not connected or unsupported chain')

    const fvLink = await sdk.identitySDK.generateFVLink(
      false,
      options.rdu ?? (typeof window !== 'undefined' ? window.location.href : undefined),
      chainId ?? undefined,
    )
    if (typeof window !== 'undefined') {
      window.open(fvLink, '_blank', 'noopener,noreferrer')
    }
  }, [createClients, createSdkInstances, chainId, options.rdu])

  const handleConnect = useCallback(async (): Promise<void> => {
    setStatus('connecting')
    setError(null)
    try {
      await connect()
      await loadClaimStatus()
    } catch (err: unknown) {
      if (!mountedRef.current) throw err
      setStatus('not_connected')
      throw err
    }
  }, [connect, loadClaimStatus])

  // ---------------------------------------------------------------------------
  // handleSwitchChain — requests the wallet to switch to a supported chain.
  // Uses the EIP-3326 wallet_switchEthereumChain method.
  // ---------------------------------------------------------------------------
  const handleSwitchChain = useCallback(
    async (targetChainId: number): Promise<void> => {
      if (!provider) throw new Error('No wallet provider available')
      await (
        provider as {
          request: (args: { method: string; params: unknown[] }) => Promise<unknown>
        }
      ).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      })
    },
    [provider],
  )

  // ---------------------------------------------------------------------------
  // Derived state: primaryAction and primaryLabel
  // ---------------------------------------------------------------------------
  const primaryAction: CitizenClaimWidgetAdapterState['primaryAction'] = useMemo(() => {
    if (status === 'connecting') return 'connect'
    if (status === 'not_connected') {
      // Connected but on wrong chain → switch_chain; not connected → connect
      return isConnected && !onSupportedChain ? 'switch_chain' : 'connect'
    }
    if (status === 'not_whitelisted') return 'verify'
    // Keep the claim button mounted while a claim is in-flight so UI copy can
    // switch to "Claiming..." without hiding the action surface.
    if (status === 'claiming') return 'claim'
    if (status === 'eligible') return 'claim'
    if (status === 'error') return 'refresh'
    return 'none'
  }, [status, isConnected, onSupportedChain])

  const primaryLabel: string = useMemo(() => {
    switch (primaryAction) {
      case 'connect':
        if (status === 'connecting') return 'Connecting...'
        return 'Connect'
      case 'verify':
        return 'Verify Identity'
      case 'claim':
        return 'Claim'
      case 'refresh':
        return 'Retry'
      case 'switch_chain':
        return 'Switch Network'
      default:
        if (status === 'claiming') return 'Claiming...'
        if (status === 'success') return 'Claimed!'
        if (status === 'already_claimed') return 'Next Claim'
        return ''
    }
  }, [primaryAction, status])

  const state: CitizenClaimWidgetAdapterState = useMemo(
    () => ({
      status,
      address: address ?? null,
      chainId: chainId ?? null,
      amount,
      token: 'G$',
      primaryAction,
      primaryLabel,
      error,
      nextClaimTime,
      claimablesByChain,
      dailyStats,
    }),
    [
      status,
      address,
      chainId,
      amount,
      primaryAction,
      primaryLabel,
      error,
      nextClaimTime,
      claimablesByChain,
      dailyStats,
    ],
  )

  const actions: CitizenClaimWidgetAdapterActions = useMemo(
    () => ({
      connect: handleConnect,
      refresh: loadClaimStatus,
      startVerification: handleVerify,
      claim: handleClaim,
      claimOnChain,
      switchChain: handleSwitchChain,
    }),
    [handleConnect, loadClaimStatus, handleVerify, handleClaim, claimOnChain, handleSwitchChain],
  )

  return { state, actions }
}
