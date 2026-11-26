import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useWallet } from '@goodwidget/core'
import { erc20ABI, GoodReserveSDK, normalizeReserveStats } from '@goodsdks/good-reserve'
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  formatUnits,
  type Chain,
} from 'viem'
import { celo, xdc } from 'viem/chains'
import type {
  ReserveSwapWidgetAdapterState,
  ReserveWidgetEnvironment,
} from './widgetRuntimeContract'
import {
  CELO_CHAIN_ID,
  DEFAULT_GD_DECIMALS,
  getStableDecimals,
  XDC_CHAIN_ID,
} from './constants'
import { mapReserveError } from './errors'

// Use viem's native chain definitions which include required formatters (especially for Celo)
// The GoodReserve SDK constructor reads publicClient.chain.id and throws when
// it is missing, so the public client must be chain-aware.
export const RESERVE_CHAINS: Record<number, Chain> = {
  [CELO_CHAIN_ID]: celo,
  [XDC_CHAIN_ID]: xdc,
}

export function getStableSymbol(chainId: number | null): string {
  return chainId === XDC_CHAIN_ID ? 'USDC' : 'USDm'
}

// Maps the raw stable/G$ balances onto the in/out slots for the active direction.
export function balancesForDirection(
  direction: ReserveSwapWidgetAdapterState['direction'],
  stableBalance: string,
  gdBalance: string,
): { tokenInBalance: string; tokenOutBalance: string } {
  return direction === 'buy'
    ? { tokenInBalance: stableBalance, tokenOutBalance: gdBalance }
    : { tokenInBalance: gdBalance, tokenOutBalance: stableBalance }
}

// ---------------------------------------------------------------------------
// Shared mutable refs type — passed between sub-hooks so they share state
// without prop-drilling through React state (which would cause extra renders).
// ---------------------------------------------------------------------------
export interface ReserveRefs {
  sdkRef: React.MutableRefObject<GoodReserveSDK | null>
  publicClientRef: React.MutableRefObject<ReturnType<typeof createPublicClient> | null>
  walletClientRef: React.MutableRefObject<ReturnType<typeof createWalletClient> | null>
  decimalsRef: React.MutableRefObject<{ stable: number; gd: number }>
  balancesRef: React.MutableRefObject<{ stable: string; gd: string }>
  tokenInBalanceRef: React.MutableRefObject<string>
  directionRef: React.MutableRefObject<ReserveSwapWidgetAdapterState['direction']>
  exitContributionRef: React.MutableRefObject<string>
  previousStatusRef: React.MutableRefObject<ReserveSwapWidgetAdapterState['status']>
  statusRef: React.MutableRefObject<ReserveSwapWidgetAdapterState['status']>
  mountedRef: React.MutableRefObject<boolean>
  /**
   * Notice to re-display once the next quote lands. The stale-quote path sets
   * this so the "review the new amount" message survives the quote_loading →
   * quote_ready transitions, which otherwise clear `warning`.
   */
  quoteRefreshNoticeRef: React.MutableRefObject<string | null>
  /**
   * Monotonic id of the latest quote request. A quote response is applied only
   * while its id is still current, so a slow response for an earlier input,
   * direction, slippage or network can never overwrite a newer one.
   */
  quoteRequestIdRef: React.MutableRefObject<number>
}

// Creates all shared refs for the adapter.
export function useReserveRefs(
  initialStatus: ReserveSwapWidgetAdapterState['status'],
  initialBalance: string,
  initialDirection: ReserveSwapWidgetAdapterState['direction'],
): ReserveRefs {
  const sdkRef = useRef<GoodReserveSDK | null>(null)
  const publicClientRef = useRef<ReturnType<typeof createPublicClient> | null>(null)
  const walletClientRef = useRef<ReturnType<typeof createWalletClient> | null>(null)
  const decimalsRef = useRef({ stable: getStableDecimals(null), gd: DEFAULT_GD_DECIMALS })
  const balancesRef = useRef({ stable: '0.00', gd: '0.00' })
  const tokenInBalanceRef = useRef(initialBalance)
  const directionRef = useRef(initialDirection)
  const exitContributionRef = useRef('0%')
  const previousStatusRef = useRef<ReserveSwapWidgetAdapterState['status']>(initialStatus)
  const statusRef = useRef<ReserveSwapWidgetAdapterState['status']>(initialStatus)
  const mountedRef = useRef(true)
  const quoteRefreshNoticeRef = useRef<string | null>(null)
  const quoteRequestIdRef = useRef(0)

  return useMemo(
    () => ({
      sdkRef,
      publicClientRef,
      walletClientRef,
      decimalsRef,
      balancesRef,
      tokenInBalanceRef,
      directionRef,
      exitContributionRef,
      previousStatusRef,
      statusRef,
      mountedRef,
      quoteRefreshNoticeRef,
      quoteRequestIdRef,
    }),
    [],
  )
}

// Syncs key state slices into refs so effects can read them without adding
// them to effect dependency arrays (which would cause undesired re-runs).
export function useReserveRefSync(
  refs: ReserveRefs,
  state: ReserveSwapWidgetAdapterState,
): void {
  useEffect(() => { refs.statusRef.current = state.status }, [refs.statusRef, state.status])
  useLayoutEffect(() => { refs.tokenInBalanceRef.current = state.tokenInBalance }, [refs.tokenInBalanceRef, state.tokenInBalance])
  useEffect(() => { refs.directionRef.current = state.direction }, [refs.directionRef, state.direction])
  useEffect(() => {
    refs.mountedRef.current = true
    return () => { refs.mountedRef.current = false }
  }, [refs.mountedRef])
}

// ---------------------------------------------------------------------------
// Bootstrap sub-hook: wallet integration + SDK construction + chain handling.
// ---------------------------------------------------------------------------
export function useReserveBootstrap(
  refs: ReserveRefs,
  applyStatePatch: (patch: Partial<ReserveSwapWidgetAdapterState>) => void,
  mockState: Partial<ReserveSwapWidgetAdapterState> | undefined,
  environment: ReserveWidgetEnvironment,
  /** Re-runs the quote pipeline once a freshly built SDK is ready. */
  requestQuoteRefresh: (notice: string | null) => void,
) {
  const { address, chainId, isConnected, provider, connect } = useWallet()
  const previousChainIdRef = useRef<number | null>(null)
  const bootstrapRequestIdRef = useRef(0)

  // The same environment applies to every chain; the SDK reports which
  // chain/environment pairs actually have reserve contracts deployed.
  const chainSupported = chainId !== null && GoodReserveSDK.isChainEnvSupported(chainId, environment)

  // Reads the wallet's CURRENT chain id directly via eth_chainId so we don't
  // trust memoized React state which may lag a mid-dialog network switch.
  const readActiveChainId = useCallback(async (): Promise<number | null> => {
    const walletProvider = provider as
      | { request?: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
      | undefined
    if (!walletProvider?.request) return null
    try {
      const hex = (await walletProvider.request({ method: 'eth_chainId' })) as string
      const parsed = Number.parseInt(hex, 16)
      return Number.isNaN(parsed) ? null : parsed
    } catch {
      return null
    }
  }, [provider])

  const refreshBalances = useCallback(async () => {
    const sdk = refs.sdkRef.current
    const publicClient = refs.publicClientRef.current
    const account = refs.walletClientRef.current?.account
    if (!sdk || !publicClient || !account) return

    const stableToken = sdk.getStableTokenAddress()
    const [stable, gd] = await Promise.all([
      publicClient.readContract({
        address: stableToken,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [account.address],
      }) as Promise<bigint>,
      sdk.getGDBalance(account.address),
    ])
    if (!refs.mountedRef.current || refs.sdkRef.current !== sdk) return

    const stableBalance = formatUnits(stable, refs.decimalsRef.current.stable)
    const gdBalance = formatUnits(gd, refs.decimalsRef.current.gd)
    refs.balancesRef.current = { stable: stableBalance, gd: gdBalance }
    applyStatePatch({
      ...balancesForDirection(refs.directionRef.current, stableBalance, gdBalance),
    })
  }, [applyStatePatch, refs])

  const invalidateSdk = useCallback(() => {
    ++bootstrapRequestIdRef.current
    refs.sdkRef.current = null
    refs.publicClientRef.current = null
    refs.walletClientRef.current = null
  }, [refs])

  const bootstrapSdk = useCallback(async () => {
    if (!provider || !address || !chainId || !chainSupported) return

    invalidateSdk()
    const requestId = bootstrapRequestIdRef.current
    const isSuperseded = () => requestId !== bootstrapRequestIdRef.current

    // A quote belongs to one chain/SDK pair, including during a manual refresh.
    applyStatePatch({
      status: 'sdk_initializing',
      hasProvider: true,
      error: null,
      quote: null,
      quoteExpiresAt: null,
    })

    try {
      const chain = RESERVE_CHAINS[chainId]
      const publicClient = createPublicClient({ chain, transport: http() })
      const transport = custom(provider as Parameters<typeof custom>[0])
      const walletClient = createWalletClient({
        account: address as `0x${string}`,
        chain,
        transport,
      })

      // exactApproval: true approves only the swap amount each time.
      const sdk = new GoodReserveSDK(publicClient, walletClient, environment, {
        exactApproval: true,
      })
      const stats = await sdk.getReserveStats()
      if (isSuperseded()) return

      refs.sdkRef.current = sdk
      refs.publicClientRef.current = publicClient
      // Kept so the swap hook can run its own pre-flight approval; see
      // useReserveSwap's ensureSwapAllowance.
      refs.walletClientRef.current = walletClient
      refs.decimalsRef.current = {
        // SDK stats are the canonical source; fall back to chain-aware defaults.
        // Celo stable (USDm) = 18, XDC stable (USDC) = 6.
        stable: stats.stableTokenDecimals ?? getStableDecimals(chainId),
        gd: stats.goodDollarDecimals ?? DEFAULT_GD_DECIMALS,
      }
      const { exitContributionPercent } = normalizeReserveStats(stats)
      refs.exitContributionRef.current =
        exitContributionPercent === null ? '0%' : `${Number(exitContributionPercent).toFixed(2)}%`

      await refreshBalances()
      if (isSuperseded()) return
      const stableSymbol = getStableSymbol(chainId)
      const dir = refs.directionRef.current
      applyStatePatch({
        status: 'idle',
        tokenInSymbol: dir === 'buy' ? stableSymbol : 'G$',
        tokenOutSymbol: dir === 'buy' ? 'G$' : stableSymbol,
        warning: null,
        error: null,
      })
      // A refresh on the same network can preserve the entered amount.
      requestQuoteRefresh(null)
    } catch (err: unknown) {
      if (isSuperseded()) return
      applyStatePatch({
        status: 'quote_error',
        error: mapReserveError(err, 'Failed to initialize GoodReserve SDK.'),
      })
    }
  }, [
    address,
    applyStatePatch,
    chainId,
    chainSupported,
    environment,
    invalidateSdk,
    provider,
    refs,
    refreshBalances,
    requestQuoteRefresh,
  ])

  // Clear chain-bound state before the new network can render.
  useLayoutEffect(() => {
    if (mockState) return
    const chainChanged = previousChainIdRef.current !== chainId
    previousChainIdRef.current = chainId
    let chainReset: Partial<ReserveSwapWidgetAdapterState> = {}
    if (chainChanged) {
      refs.balancesRef.current = { stable: '0.00', gd: '0.00' }
      refs.tokenInBalanceRef.current = '0.00'
      refs.quoteRefreshNoticeRef.current = null
      chainReset = {
        inputAmount: '',
        tokenInBalance: '0.00',
        tokenOutBalance: '0.00',
        quote: null,
        quoteExpiresAt: null,
        warning: null,
      }
    }
    if (!provider || !isConnected || !address) {
      applyStatePatch({
        ...chainReset,
        status: 'no_provider',
        hasProvider: Boolean(provider),
        address: null,
        chainId: null,
      })
      return
    }
    applyStatePatch({ ...chainReset, address, chainId, hasProvider: true })
    if (!chainSupported) {
      applyStatePatch({ status: 'unsupported_chain', error: null, quote: null, quoteExpiresAt: null })
      return
    }
    void bootstrapSdk()
    return invalidateSdk
  }, [address, applyStatePatch, bootstrapSdk, chainId, chainSupported, invalidateSdk, isConnected, mockState, provider, refs])

  return { address, chainId, provider, chainSupported, connect, readActiveChainId, refreshBalances, bootstrapSdk }
}
