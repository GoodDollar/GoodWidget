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

/** Resolves a supported chain id to its display name, falling back to the raw id. */
function getChainDisplayName(chainId: number): string {
  return CHAIN_CONFIGS[chainId]?.name ?? `Chain ${chainId}`
}

/**
 * Thrown for adapter-level failures whose message is already user-facing
 * (e.g. naming the specific chain an action cannot run on). humanReadableError
 * passes these through verbatim instead of remapping them to a generic string.
 */
class CitizenClaimAdapterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CitizenClaimAdapterError'
  }
}

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

  if (err instanceof CitizenClaimAdapterError) {
    return err.message
  }

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
 *   loading → not_whitelisted | eligible | already_claimed | unsupported_chain | error
 *   unsupported_chain → [switch_chain] → loading
 *   not_whitelisted → [verify] → (external FV flow) → loading after return
 *   eligible → [claim] → claiming → success | error
 *   error → [refresh] → loading
 */
export function useCitizenClaimAdapter(
  options: UseCitizenClaimAdapterOptions = {},
): CitizenClaimWidgetAdapterResult {
  const { address, chainId, isConnected, provider, availableChainIds, connect, switchChain } =
    useWallet()

  const clientFactory = options.clientFactory
  const claimExecution = options.claimExecution
  const isCustodialExecution = claimExecution?.mode === 'custodial'

  // Normalise env string to one of the SDK-declared runtime environments.
  const env = (
    options.environment && AVAILABLE_ENVIRONMENTS.includes(options.environment)
      ? options.environment
      : 'production'
  ) as CitizenEnvironment

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

  // Custodial integrations own one public client per chain. Reuse those
  // clients for entitlement/stat reads as well as claim execution so the
  // widget does not silently switch back to its fallback RPCs.
  const getPublicClientForChain = useCallback(
    (targetChainId: number): PublicClient | null => {
      if (isCustodialExecution) {
        const configuredClients = claimExecution?.clientsByChain[targetChainId]
        return (
          configuredClients?.publicClient ??
          configuredClients?.readClient ??
          null
        ) as PublicClient | null
      }

      const chain = CHAIN_CONFIGS[targetChainId]
      const rpcUrl = chain?.rpcUrls.default.http[0]
      if (!chain || !rpcUrl) return null
      return createPublicClient({ chain, transport: http(rpcUrl) })
    },
    [claimExecution, isCustodialExecution],
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
  // SDK factory — uses wallet-owned clients only for the explicit custodial
  // mode. ClaimSDK's normal write path preserves the validated contract
  // request returned by simulateContract; ClaimCustodialSDK's custom raw
  // transaction path is not used here because it can lose `to` and `data`.
  // ---------------------------------------------------------------------------
  const createSdkInstances = useCallback(
    (clients: Awaited<ReturnType<typeof resolveClientsForChain>>) => {
      if (!clients) return null
      const { publicClient, walletClient } = clients
      const sdkAccount = address ?? walletClient.account?.address
      const rdu = options.rdu ?? (typeof window !== 'undefined' ? window.location.href : '')

      if (!sdkAccount) return null
      const identitySDK = isCustodialExecution
        ? new IdentityCustodialSDK({ publicClient, walletClient, env })
        : new IdentitySDK({ publicClient, walletClient, env })
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

  // ---------------------------------------------------------------------------
  // Read-only client resolution — balance/entitlement reads never need a
  // connected account or the passed-down provider, only the address to read
  // for. Custodial mode reuses its own configured per-chain clients (already
  // address-scoped); the default path builds an RPC-backed publicClient plus
  // a signer-less walletClient carrying just `account`, since checkEntitlement/
  // getWalletClaimStatus only use walletClient.account to identify whose
  // entitlement to read and never send a transaction through it.
  // ---------------------------------------------------------------------------
  const createReadOnlyClientsForChain = useCallback(
    (targetChainId: number) => {
      if (!address) return null

      if (isCustodialExecution) {
        const configuredClients = claimExecution?.clientsByChain[targetChainId]
        return configuredClients ? normalizeClientBundle(configuredClients) : null
      }

      const chain = CHAIN_CONFIGS[targetChainId]
      const rpcUrl = chain?.rpcUrls.default.http[0]
      if (!chain || !rpcUrl) return null

      const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
      const walletClient = createWalletClient({
        account: address as `0x${string}`,
        chain,
        transport: http(rpcUrl),
      })
      return { publicClient, walletClient }
    },
    [address, claimExecution, isCustodialExecution, normalizeClientBundle],
  )

  const createReadOnlySdkForChain = useCallback(
    (targetChainId: number) => createSdkInstances(createReadOnlyClientsForChain(targetChainId)),
    [createReadOnlyClientsForChain, createSdkInstances],
  )

  /**
   * Collects claimable UBI amounts for all citizen-sdk supported chains.
   * This mirrors GoodWalletV2's claim breakdown model (eligible amounts per chain).
   *
   * These are personalized reads once an address is known, but they never need
   * a connected account or the passed-down provider — each supported chain gets
   * its own independently-scoped, read-only SDK instance (RPC-backed publicClient
   * + a signer-less walletClient carrying just the address), so no chain's read
   * depends on any other chain being "active".
   */
  const loadClaimablesByChain = useCallback(async (): Promise<void> => {
    const eligible: Array<{ chainId: number; amount: string }> = []

    if (address) {
      await Promise.all(
        SUPPORTED_CHAINS.map(async (supportedChainId) => {
          try {
            const sdk = createReadOnlySdkForChain(supportedChainId)
            if (!sdk) return
            const result = await sdk.claimSDK.checkEntitlement()
            if (result.amount <= 0n) return

            const decimals = CHAIN_DECIMALS[supportedChainId] ?? 18
            eligible.push({
              chainId: supportedChainId,
              amount: formatUnits(result.amount, decimals),
            })
          } catch {
            // Keep per-chain reads best-effort: one RPC/SDK failure should not block the widget.
          }
        }),
      )
    } else {
      // No address at all: fall back to the non-personalized, chain-level entitlement reads.
      await Promise.all(
        SUPPORTED_CHAINS.map(async (supportedChainId) => {
          try {
            const publicClient = getPublicClientForChain(supportedChainId)
            if (!publicClient) return
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
    }

    if (!mountedRef.current) return
    eligible.sort((a, b) => b.chainId - a.chainId)
    setClaimablesByChain(eligible)
  }, [address, createReadOnlySdkForChain, env, getPublicClientForChain])

  const loadDailyStats = useCallback(async (): Promise<void> => {
    let maxClaimers = 0
    let totalClaimed = 0

    await Promise.all(
      SUPPORTED_CHAINS.map(async (supportedChainId) => {
        try {
          const publicClient = getPublicClientForChain(supportedChainId)
          if (!publicClient) return
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
  }, [env, getPublicClientForChain])

  // ---------------------------------------------------------------------------
  // loadClaimStatus — primary refresh action.
  // Calls getWalletClaimStatus() and maps the SDK result to widget status.
  // ---------------------------------------------------------------------------
  const loadClaimStatus = useCallback(async () => {
    // These are best-effort UI reads. Start them without making the primary
    // wallet eligibility check wait for every auxiliary RPC response.
    const auxiliaryReads = Promise.all([
      loadClaimablesByChain(),
      loadDailyStats(),
    ])

    if (!address) {
      await auxiliaryReads
      // No wallet address: clear any personalized entitlement left over from a
      // prior connected session so a disconnected user never sees stale amounts.
      setAmount(null)
      setNextClaimTime(null)
      setStatus('not_connected')
      return
    }

    if (!isCustodialExecution && chainId === null) {
      // Wallet is connected but hasn't reported an active chain yet (common
      // right after connecting) — treat this as still resolving rather than
      // unsupported, since it's unknown whether the eventual chain will be
      // supported. The chainId-keyed effect below reruns this once it
      // resolves, so this never gets stuck.
      await auxiliaryReads
      setStatus('loading')
      return
    }

    // Custodial execution submits claims through its own configured per-chain
    // clients, never the active wallet chain, so it has no dependency on
    // `chainId` at all — read the personalized status from whichever
    // configured chain comes first, rather than gating on an "active chain"
    // that may never resolve to a supported one (or may not exist).
    const statusChainId = isCustodialExecution
      ? SUPPORTED_CHAINS.find((supportedChainId) => claimExecution?.clientsByChain[supportedChainId]) ??
        null
      : chainId

    if (isCustodialExecution && statusChainId === null) {
      await auxiliaryReads
      // Custodial execution has no wallet chain to switch, so a missing
      // client for every supported chain is an integrator configuration
      // problem rather than something the "switch network" narrative below
      // could ever resolve — route it to a plain error instead.
      setAmount(null)
      setNextClaimTime(null)
      setStatus('error')
      setError(
        humanReadableError(
          new CitizenClaimAdapterError('Claim execution is not configured for any supported chain.'),
        ),
      )
      return
    }

    if (statusChainId === null || !isSupportedChain(statusChainId)) {
      await auxiliaryReads
      // Chain is known but unsupported — a distinct status from not_connected
      // so the UI can show "switch chain" copy instead of misleadingly asking
      // an already-connected wallet to connect. Clear personalized entitlement
      // from whatever chain was previously active.
      setAmount(null)
      setNextClaimTime(null)
      setStatus('unsupported_chain')
      return
    }

    setStatus('loading')
    setError(null)

    // A personalized status read, but still address-only: no connected
    // account or passed-down provider is required, only the address itself.
    const sdk = createReadOnlySdkForChain(statusChainId)
    if (!sdk) {
      // The address is known and statusChainId passed the supported-chain
      // check above, so a null sdk here means client/RPC setup itself
      // failed (e.g. a misconfigured chain) rather than no wallet being
      // connected — 'not_connected' would tell an already-connected user
      // to do something they've already done.
      setStatus('error')
      setError(humanReadableError(new CitizenClaimAdapterError('Unable to load claim status for this chain right now.')))
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
        const decimals = CHAIN_DECIMALS[statusChainId] ?? 18
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
    address,
    chainId,
    claimExecution,
    isCustodialExecution,
    createReadOnlySdkForChain,
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
      if (!isCustodialExecution && !provider) {
        throw new CitizenClaimAdapterError('No wallet provider available')
      }
      if (!address && !isCustodialExecution) {
        throw new CitizenClaimAdapterError('Wallet not connected')
      }

      if (!isSupportedChain(targetChainId)) {
        throw new CitizenClaimAdapterError(`Unsupported chain for citizen-sdk: ${targetChainId}`)
      }

      // Execute actions must stay within the chains the passed-down provider
      // can actually sign for right now. Custodial execution supplies its own
      // pre-configured per-chain clients and is not subject to this restriction.
      if (!isCustodialExecution && availableChainIds && !availableChainIds.includes(targetChainId)) {
        throw new CitizenClaimAdapterError(
          `Claim is not available on ${getChainDisplayName(targetChainId)} for this connection.`,
        )
      }

      setStatus('claiming')
      setError(null)

      // A single EIP-1193 provider has one active chain. Custodial clients are
      // already chain-bound, so switching would introduce a race between claims.
      // switchChain tries the raw wallet_switchEthereumChain request first and
      // falls back to the integrator's own switch/network-modal flow (e.g.
      // AppKit) when the active connector rejects or ignores it.
      if (!isCustodialExecution) {
        await switchChain(targetChainId)
      }

      const sdk = await createSdkInstancesForChain(targetChainId)
      if (!sdk) {
        throw new CitizenClaimAdapterError(
          `Unable to initialize SDK clients for ${getChainDisplayName(targetChainId)}`,
        )
      }

      return sdk.claimSDK.claim()
    },
    [address, availableChainIds, createSdkInstancesForChain, isCustodialExecution, provider, switchChain],
  )

  // ---------------------------------------------------------------------------
  // handleSwitchChain — the switchChain action exposed to widget UI (the
  // standalone "switch to a supported chain" prompt, as opposed to the
  // claim-flow's internal switchChain call inside claimOnChain). Wraps the raw
  // useWallet() switchChain so a wallet rejection or RPC failure always reaches
  // the widget as a humanized message in state.error, never as a raw error.
  // ---------------------------------------------------------------------------
  const handleSwitchChain = useCallback(
    async (targetChainId: number): Promise<void> => {
      setError(null)
      try {
        await switchChain(targetChainId)
      } catch (err: unknown) {
        if (!mountedRef.current) return
        // Sets state.error so the inline banner shows a humanized message
        // immediately, then rethrows — mirroring handleClaim above — so the
        // widget's own catch can also name the specific chain that failed
        // in a toast/onClaimError, which needs the raw error to reach it.
        setStatus('error')
        setError(humanReadableError(err))
        throw err
      }
    },
    [switchChain],
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
  // Derived state: primaryAction and primaryLabel
  // ---------------------------------------------------------------------------
  const primaryAction: CitizenClaimWidgetAdapterState['primaryAction'] = useMemo(() => {
    if (status === 'connecting') return 'connect'
    // Custodial execution is multi-chain. An account-scoped entitlement on any
    // configured chain must take precedence over the active chain's status.
    if (isConnected && address && claimablesByChain.length > 0) return 'claim'
    if (status === 'unsupported_chain') {
      // Custodial clients are already configured per chain, so they never need
      // the active wallet chain to be switched. Native wallet integrations keep
      // the existing switch-chain behavior.
      return isCustodialExecution ? 'none' : 'switch_chain'
    }
    if (status === 'not_connected') return 'connect'
    if (status === 'not_whitelisted') return 'verify'
    // Keep the claim button mounted while a claim is in-flight so UI copy can
    // switch to "Claiming..." without hiding the action surface.
    if (status === 'claiming') return 'claim'
    if (status === 'eligible') return 'claim'
    if (status === 'error') return 'refresh'
    return 'none'
  }, [
    status,
    address,
    isConnected,
    isCustodialExecution,
    claimablesByChain,
  ])

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
