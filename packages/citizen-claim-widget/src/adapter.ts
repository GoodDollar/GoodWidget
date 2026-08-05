import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '@goodwidget/core'
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  http,
  type Account,
  type Chain,
  type PublicClient,
  type Transport,
  type WalletClient,
} from 'viem'
import {
  ClaimSDK,
  ClaimCustodialSDK,
  IdentitySDK,
  IdentityCustodialSDK,
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
  CitizenClaimWidgetChainClaimResult,
  CitizenClaimWidgetClientBundle,
  CitizenClaimWidgetClientFactory,
  CitizenClaimWidgetCustodialExecution,
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

// ---------------------------------------------------------------------------
// humanReadableError — converts a raw SDK/viem error into a short, user-friendly
// string. The full technical error is always logged to the console for debugging.
// ---------------------------------------------------------------------------
/**
 * Maps a raw error (viem RPC error, network failure, contract revert, etc.) to a
 * short, human-readable string suitable for display in the widget UI.
 *
 * The full error is always logged to `console.error` so it remains available for
 * debugging without cluttering the user-facing card.
 *
 * @param err - The caught error value (may be any type).
 * @returns A concise, user-friendly error string.
 */
function humanReadableError(err: unknown): string {
  console.error('[CitizenClaimWidget]', err)

  if (!(err instanceof Error)) {
    // Log the raw value so non-Error throws are still traceable
    console.error('[CitizenClaimWidget] non-Error thrown:', typeof err, err)
    return 'Something went wrong. Please try again.'
  }

  const msg = err.message

  // Network-level failures (fetch failed, connection refused, etc.)
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('HTTP request failed') ||
    msg.includes('fetch failed') ||
    msg.includes('NetworkError') ||
    msg.includes('net::ERR_') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT')
  ) {
    return 'Unable to reach the network. Check your connection and try again.'
  }

  // Timeout
  if (msg.includes('timeout') || msg.includes('Timeout') || msg.includes('timed out')) {
    return 'The request timed out. Please try again.'
  }

  // User rejected transaction
  if (
    msg.includes('User rejected') ||
    msg.includes('user rejected') ||
    msg.includes('4001') ||
    msg.includes('ACTION_REJECTED')
  ) {
    return 'Transaction rejected by wallet.'
  }

  // Insufficient funds
  if (msg.includes('insufficient funds') || msg.includes('InsufficientFunds')) {
    return 'Insufficient funds to complete this transaction.'
  }

  // Contract revert — try to extract just the revert reason
  if (msg.includes('reverted') || msg.includes('revert')) {
    const reasonMatch = msg.match(/reason:\s*(.+?)(?:\n|$)/)
    if (reasonMatch) {
      // Sanitize: strip control characters and cap length to avoid injection/overflow
      const reason = reasonMatch[1].replace(/[^\x20-\x7E]/g, '').trim().slice(0, 80)
      if (reason) {
        return `Transaction failed: ${reason}`
      }
    }
    return 'Transaction was reverted. Please try again.'
  }

  // Unsupported chain
  if (msg.includes('unsupported chain') || msg.includes('Unsupported chain')) {
    return 'This network is not supported. Please switch to a supported chain.'
  }

  return 'Something went wrong. Please try again.'
}

export interface UseCitizenClaimAdapterOptions {
  environment?: CitizenClaimWidgetEnvironment
  clientFactory?: CitizenClaimWidgetClientFactory
  claimExecution?: CitizenClaimWidgetCustodialExecution
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
 * 3. Instantiates IdentitySDK + ClaimSDK from those clients, or the custodial
 *    variants when an explicit multi-chain execution config is provided
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

  const clientFactory = options.clientFactory
  const claimExecution = options.claimExecution
  const isCustodialExecution = claimExecution?.mode === 'custodial'

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
  // Client resolution — custodial clients are supplied by the integrator and
  // never routed through the active-chain EIP-1193 provider. The factory remains
  // available for integrations that prefer lazy per-chain client creation.
  // ---------------------------------------------------------------------------
  const createProviderClientsForChain = useCallback(
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

  const normalizeClientBundle = useCallback(
    (bundle: CitizenClaimWidgetClientBundle | null | undefined) => {
      if (!bundle) return null
      const publicClient = bundle.publicClient ?? bundle.readClient
      if (!publicClient) {
        throw new Error('CitizenClaimWidget: client bundle is missing publicClient')
      }
      return {
        publicClient: publicClient as PublicClient,
        walletClient: bundle.walletClient as WalletClient<
          Transport,
          Chain | undefined,
          Account | undefined
        >,
      }
    },
    [],
  )

  const resolveClientsForChain = useCallback(
    async (targetChainId: number) => {
      if (isCustodialExecution) {
        const configuredClients = claimExecution?.clientsByChain[targetChainId]
        if (configuredClients) return normalizeClientBundle(configuredClients)

        if (!clientFactory || !provider || !address) {
          throw new Error(
            `CitizenClaimWidget: no custodial clients configured for chain ${targetChainId}`,
          )
        }
      }

      if (clientFactory && provider && address) {
        const factoryClients = await clientFactory({
          provider,
          address,
          chainId: targetChainId,
        })
        return normalizeClientBundle(factoryClients)
      }

      return normalizeClientBundle(createProviderClientsForChain(targetChainId))
    },
    [
      address,
      claimExecution,
      clientFactory,
      createProviderClientsForChain,
      isCustodialExecution,
      normalizeClientBundle,
      provider,
    ],
  )

  // ---------------------------------------------------------------------------
  // SDK factory — selects custodial SDKs only for the explicit custodial mode.
  // ---------------------------------------------------------------------------
  const createSdkInstances = useCallback(
    (clients: Awaited<ReturnType<typeof resolveClientsForChain>>) => {
      if (!clients) return null
      const { publicClient, walletClient } = clients
      const sdkAccount = address ?? walletClient.account?.address
      const rdu = options.rdu ?? (typeof window !== 'undefined' ? window.location.href : '')

      if (isCustodialExecution) {
        const identitySDK = new IdentityCustodialSDK({ publicClient, walletClient, env })
        const claimSDK = new ClaimCustodialSDK({
          publicClient,
          walletClient,
          identitySDK,
          env,
          rdu,
        })
        return { identitySDK, claimSDK }
      }

      if (!sdkAccount) return null
      const identitySDK = new IdentitySDK({ publicClient, walletClient, env })
      const claimSDK = new ClaimSDK({
        account: sdkAccount as `0x${string}`,
        publicClient,
        walletClient,
        identitySDK,
        env,
        rdu,
      })
      return { identitySDK, claimSDK }
    },
    [address, env, isCustodialExecution, options.rdu, resolveClientsForChain],
  )

  const createSdkInstancesForChain = useCallback(
    async (targetChainId: number) => {
      const clients = await resolveClientsForChain(targetChainId)
      return createSdkInstances(clients)
    },
    [createSdkInstances, resolveClientsForChain],
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

    const sdk = await createSdkInstancesForChain(chainId)
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
      setError(humanReadableError(err))
    }
  }, [
    isConnected,
    address,
    onSupportedChain,
    chainId,
    createSdkInstancesForChain,
    loadClaimablesByChain,
    loadDailyStats,
  ])

  // Auto-refresh claim status whenever wallet connection or chain changes
  useEffect(() => {
    void loadClaimStatus()
    // Re-run only on wallet identity changes; loadClaimStatus is stable per render.
  }, [isConnected, address, chainId])

  // ---------------------------------------------------------------------------
  // handleClaim — executes the UBI claim transaction via ClaimSDK.
  // Transitions: eligible → claiming → success | error
  // ---------------------------------------------------------------------------
  const claimOnChain = useCallback(
    async (targetChainId: number): Promise<unknown> => {
      if (!isCustodialExecution && !provider) throw new Error('No wallet provider available')
      if (!address && !isCustodialExecution) throw new Error('Wallet not connected')

      if (!isSupportedChain(targetChainId)) {
        throw new Error(`Unsupported chain for citizen-sdk: ${targetChainId}`)
      }

      setStatus('claiming')
      setError(null)

      // A single EIP-1193 provider has one active chain. Custodial clients are
      // already chain-bound, so switching would introduce a race between claims.
      if (!isCustodialExecution) {
        await (
          provider as {
            request: (args: { method: string; params: unknown[] }) => Promise<unknown>
          }
        ).request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        })
      }

      const sdk = await createSdkInstancesForChain(targetChainId)
      if (!sdk) throw new Error('Unable to initialize SDK clients for target chain')

      return sdk.claimSDK.claim()
    },
    [provider, address, createSdkInstancesForChain, isCustodialExecution],
  )

  const claimAll = useCallback(
    async (targetChainIds: number[]): Promise<CitizenClaimWidgetChainClaimResult[]> => {
      const chainIdsToClaim = [...new Set(targetChainIds)]

      if (isCustodialExecution) {
        const settled = await Promise.allSettled(
          chainIdsToClaim.map(async (targetChainId) => ({
            chainId: targetChainId,
            receipt: await claimOnChain(targetChainId),
          })),
        )

        return settled.map((result, index) =>
          result.status === 'fulfilled'
            ? {
                chainId: result.value.chainId,
                status: 'fulfilled' as const,
                receipt: result.value.receipt,
              }
            : {
                chainId: chainIdsToClaim[index],
                status: 'rejected' as const,
                error: result.reason,
              },
        )
      }

      const results: CitizenClaimWidgetChainClaimResult[] = []
      for (const targetChainId of chainIdsToClaim) {
        try {
          results.push({
            chainId: targetChainId,
            status: 'fulfilled',
            receipt: await claimOnChain(targetChainId),
          })
        } catch (claimError: unknown) {
          results.push({
            chainId: targetChainId,
            status: 'rejected',
            error: claimError,
          })
        }
      }
      return results
    },
    [claimOnChain, isCustodialExecution],
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
      setStatus('error')
      setError(humanReadableError(err))
      throw err
    }
  }, [chainId, claimOnChain, loadClaimStatus])

  // ---------------------------------------------------------------------------
  // handleVerify — initiates the GoodID face-verification flow.
  // Opens in a new tab; the page reloads/redirects back when complete.
  // ---------------------------------------------------------------------------
  const handleVerify = useCallback(async (): Promise<void> => {
    const sdk = await createSdkInstancesForChain(chainId ?? 0)
    if (!sdk) throw new Error('Wallet not connected or unsupported chain')

    const fvLink = await sdk.identitySDK.generateFVLink(
      false,
      options.rdu ?? (typeof window !== 'undefined' ? window.location.href : undefined),
      chainId ?? undefined,
    )
    if (typeof window !== 'undefined') {
      window.open(fvLink, '_blank', 'noopener,noreferrer')
    }
  }, [createSdkInstancesForChain, chainId, options.rdu])

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
      claimAll,
      switchChain: handleSwitchChain,
    }),
    [
      handleConnect,
      loadClaimStatus,
      handleVerify,
      handleClaim,
      claimOnChain,
      claimAll,
      handleSwitchChain,
    ],
  )

  return { state, actions }
}
