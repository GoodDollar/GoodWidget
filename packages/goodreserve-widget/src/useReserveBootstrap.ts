import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useWallet } from '@goodwidget/core'
import { erc20ABI, GoodReserveSDK, getReserveChainFromId } from '@goodsdks/good-reserve'
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
  ReserveSwapWidgetEnvironment,
} from './widgetRuntimeContract'
import {
  CELO_CHAIN_ID,
  DEFAULT_GD_DECIMALS,
  EXIT_CONTRIBUTION_PPM_DIVISOR,
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
  bootstrapGenRef: React.MutableRefObject<number>
  quoteGenRef: React.MutableRefObject<number>
  /**
   * Notice to re-display once the next quote lands. The stale-quote path sets
   * this so the "review the new amount" message survives the quote_loading →
   * quote_ready transitions, which otherwise clear `warning`.
   */
  quoteRefreshNoticeRef: React.MutableRefObject<string | null>
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
  const bootstrapGenRef = useRef(0)
  const quoteGenRef = useRef(0)
  const quoteRefreshNoticeRef = useRef<string | null>(null)

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
      bootstrapGenRef,
      quoteGenRef,
      quoteRefreshNoticeRef,
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
  useEffect(() => { refs.tokenInBalanceRef.current = state.tokenInBalance }, [refs.tokenInBalanceRef, state.tokenInBalance])
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
  environment?: ReserveSwapWidgetEnvironment,
  requestQuoteRefresh?: (notice: string | null) => void,
) {
  const { address, chainId, isConnected, provider, connect } = useWallet()

  const reserveEnvironment: ReserveSwapWidgetEnvironment =
    environment ?? (chainId === XDC_CHAIN_ID ? 'development' : 'production')
  const chainSupported =
    chainId !== null &&
    (GoodReserveSDK.isChainEnvSupported(chainId, reserveEnvironment) ||
      getReserveChainFromId(chainId) !== null)

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
    if (!address || !refs.sdkRef.current || !refs.publicClientRef.current) return
    const sdk = refs.sdkRef.current
    const publicClient = refs.publicClientRef.current
    const stableToken = sdk.getStableTokenAddress()
    const [stable, gd] = await Promise.all([
      publicClient.readContract({
        address: stableToken,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      }) as Promise<bigint>,
      sdk.getGDBalance(address as `0x${string}`),
    ])
    if (!refs.mountedRef.current || refs.sdkRef.current !== sdk) return
    const stableBalance = formatUnits(stable, refs.decimalsRef.current.stable)
    const gdBalance = formatUnits(gd, refs.decimalsRef.current.gd)
    refs.balancesRef.current = { stable: stableBalance, gd: gdBalance }
    applyStatePatch({
      ...balancesForDirection(refs.directionRef.current, stableBalance, gdBalance),
    })
  }, [address, applyStatePatch, refs])

  const bootstrapSdk = useCallback(async () => {
    if (!provider || !address || !chainId || !chainSupported) return

    const gen = ++refs.bootstrapGenRef.current
    refs.quoteGenRef.current += 1
    refs.quoteRefreshNoticeRef.current = null

    // Drop any SDK/client bound to a previous chain or environment so a switch
    // re-initializes against the new deployment instead of reusing stale state.
    refs.sdkRef.current = null
    refs.publicClientRef.current = null
    refs.walletClientRef.current = null

    applyStatePatch({
      status: 'sdk_initializing',
      hasProvider: true,
      quote: null,
      quoteExpiresAt: null,
      warning: null,
      error: null,
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
      const sdk = new GoodReserveSDK(publicClient, walletClient, reserveEnvironment, {
        exactApproval: true,
      })
      const stats = await sdk.getReserveStats()
      if (!refs.mountedRef.current || gen !== refs.bootstrapGenRef.current) return

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
      // Mento's BancorExchangeProvider stores exitContribution as a uint32
      // scaled by MAX_WEIGHT = 1e8, so the raw value is a fraction in parts per
      // hundred-million. Dividing by 1e6 converts it straight to a percentage.
      // Verified on the live Celo pool: raw 10_000_000 → 10.00% (and the
      // sibling reserveRatio 40_445_300 → 40.45%, which cross-checks the scale).
      refs.exitContributionRef.current =
        stats.exitContribution != null
          ? `${(stats.exitContribution / EXIT_CONTRIBUTION_PPM_DIVISOR).toFixed(2)}%`
          : '0%'

      await refreshBalances()
      if (!refs.mountedRef.current || gen !== refs.bootstrapGenRef.current) return

      const stableSymbol = getStableSymbol(chainId)
      const dir = refs.directionRef.current
      applyStatePatch({
        status: 'idle',
        tokenInSymbol: dir === 'buy' ? stableSymbol : 'G$',
        tokenOutSymbol: dir === 'buy' ? 'G$' : stableSymbol,
        quote: null,
        quoteExpiresAt: null,
        warning: null,
        error: null,
      })
      requestQuoteRefresh?.(null)
    } catch (err: unknown) {
      if (!refs.mountedRef.current || gen !== refs.bootstrapGenRef.current) return
      applyStatePatch({
        status: 'quote_error',
        quote: null,
        quoteExpiresAt: null,
        error: mapReserveError(err, 'Failed to initialize GoodReserve SDK.'),
      })
    }
  }, [
    address,
    applyStatePatch,
    chainId,
    chainSupported,
    provider,
    refs,
    refreshBalances,
    requestQuoteRefresh,
    reserveEnvironment,
  ])

  // Drive the provider/chain connection lifecycle.
  useEffect(() => {
    if (mockState) return
    if (!provider || !isConnected || !address) {
      refs.bootstrapGenRef.current += 1
      refs.quoteGenRef.current += 1
      refs.sdkRef.current = null
      refs.publicClientRef.current = null
      refs.walletClientRef.current = null
      applyStatePatch({
        status: 'no_provider',
        hasProvider: Boolean(provider),
        address: null,
        chainId: null,
        quote: null,
        quoteExpiresAt: null,
      })
      return
    }
    applyStatePatch({ address, chainId, hasProvider: true })
    if (!chainSupported) {
      refs.bootstrapGenRef.current += 1
      refs.quoteGenRef.current += 1
      refs.sdkRef.current = null
      refs.publicClientRef.current = null
      refs.walletClientRef.current = null
      applyStatePatch({
        status: 'unsupported_chain',
        quote: null,
        quoteExpiresAt: null,
        error: null,
      })
      return
    }
    void bootstrapSdk()
    return () => {
      refs.bootstrapGenRef.current += 1
      refs.quoteGenRef.current += 1
    }
  }, [address, applyStatePatch, bootstrapSdk, chainId, chainSupported, isConnected, mockState, provider, refs])

  return { address, chainId, provider, chainSupported, connect, readActiveChainId, refreshBalances, bootstrapSdk }
}
