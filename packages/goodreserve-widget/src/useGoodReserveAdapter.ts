import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '@goodwidget/core'
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  parseUnits,
  type Chain,
} from 'viem'
import type {
  ReserveSwapDirection,
  ReserveSwapWidgetAdapterResult,
  ReserveSwapWidgetAdapterState,
} from './widgetRuntimeContract'
import {
  CELO_CHAIN_ID,
  DEFAULT_GD_DECIMALS,
  DEFAULT_SLIPPAGE_PERCENT,
  DEFAULT_STABLE_DECIMALS,
  QUOTE_DEBOUNCE_MS,
  QUOTE_TTL_MS,
  SUPPORTED_RESERVE_CHAINS,
  XDC_CHAIN_ID,
} from './constants'
import { mapReserveError } from './errors'
import { sanitizeAmount } from './amount'

// Minimal viem Chain definitions for the supported reserve chains. The
// GoodReserve SDK constructor reads publicClient.chain.id and throws when it is
// missing, so the public client must be chain-aware (mirrors the pattern in
// citizen-claim-widget's adapter).
const RESERVE_CHAINS: Record<number, Chain> = {
  [CELO_CHAIN_ID]: {
    id: CELO_CHAIN_ID,
    name: 'Celo',
    nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
    rpcUrls: { default: { http: ['https://forno.celo.org'] } },
  } as Chain,
  [XDC_CHAIN_ID]: {
    id: XDC_CHAIN_ID,
    name: 'XDC Network',
    nativeCurrency: { name: 'XDC', symbol: 'XDC', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.ankr.com/xdc'] } },
  } as Chain,
}

type GoodReserveSDKLike = {
  getStableTokenAddress: () => `0x${string}`
  getGoodDollarAddress: () => `0x${string}`
  getReserveStats: () => Promise<{
    stableTokenDecimals?: number
    goodDollarDecimals?: number
    exitContribution?: number | null
  }>
  getBuyQuote: (stableToken: `0x${string}`, amountIn: bigint) => Promise<bigint>
  getSellQuote: (gdAmount: bigint, stableToken: `0x${string}`) => Promise<bigint>
  buy: (
    stableToken: `0x${string}`,
    amountIn: bigint,
    minReturn: bigint,
  ) => Promise<{ hash: `0x${string}`; receipt: { transactionHash: string } }>
  sell: (
    stableToken: `0x${string}`,
    amountIn: bigint,
    minReturn: bigint,
  ) => Promise<{ hash: `0x${string}`; receipt: { transactionHash: string } }>
}

type GoodReserveSDKConstructor = new (
  publicClient: unknown,
  walletClient: unknown,
  env: 'production' | 'development',
) => GoodReserveSDKLike

type Erc20ReadClient = {
  readContract: (params: {
    address: `0x${string}`
    abi: readonly unknown[]
    functionName: 'balanceOf'
    args: [`0x${string}`]
  }) => Promise<bigint>
}

const erc20BalanceOfAbi = [
  {
    type: 'function',
    stateMutability: 'view',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// Loads the SDK module dynamically so workspace builds still run if the SDK package is missing.
async function loadGoodReserveSdkConstructor(): Promise<
  GoodReserveSDKConstructor | null
> {
  try {
    const importer = new Function('moduleName', 'return import(moduleName)') as (
      moduleName: string,
    ) => Promise<Record<string, unknown>>
    const module = await importer('@goodsdks/good-reserve')
    const ctor = module.GoodReserveSDK
    if (typeof ctor !== 'function') return null
    return ctor as GoodReserveSDKConstructor
  } catch {
    return null
  }
}

const initialState: ReserveSwapWidgetAdapterState = {
  status: 'no_provider',
  chainId: null,
  address: null,
  hasProvider: false,
  direction: 'buy',
  inputAmount: '',
  slippagePercent: DEFAULT_SLIPPAGE_PERCENT,
  tokenInSymbol: 'USDm',
  tokenOutSymbol: 'G$',
  tokenInBalance: '0.00',
  tokenOutBalance: '0.00',
  quote: null,
  warning: null,
  error: null,
  txHash: null,
  lastSwapOutput: null,
  quoteExpiresAt: null,
}

function getStableSymbol(chainId: number | null): string {
  return chainId === XDC_CHAIN_ID ? 'USDC' : 'USDm'
}

// Maps the raw stable/G$ balances onto the in/out slots for the active direction.
// Buy spends the stable token for G$; sell spends G$ for the stable token.
function balancesForDirection(
  direction: ReserveSwapDirection,
  stableBalance: string,
  gdBalance: string,
): { tokenInBalance: string; tokenOutBalance: string } {
  return direction === 'buy'
    ? { tokenInBalance: stableBalance, tokenOutBalance: gdBalance }
    : { tokenInBalance: gdBalance, tokenOutBalance: stableBalance }
}

export function useGoodReserveAdapter(
  mockState?: Partial<ReserveSwapWidgetAdapterState>,
): ReserveSwapWidgetAdapterResult {
  const { address, chainId, isConnected, provider, connect } = useWallet()

  const [state, setState] = useState<ReserveSwapWidgetAdapterState>({
    ...initialState,
    ...mockState,
  })

  const sdkRef = useRef<GoodReserveSDKLike | null>(null)
  const readClientRef = useRef<Erc20ReadClient | null>(null)
  const decimalsRef = useRef({ stable: DEFAULT_STABLE_DECIMALS, gd: DEFAULT_GD_DECIMALS })
  // Raw on-chain balances kept independent of direction so the in/out slots can
  // be remapped instantly when the user toggles buy/sell.
  const balancesRef = useRef({ stable: '0.00', gd: '0.00' })
  // Latest "from" balance, read inside the quote effect without adding it to the
  // effect deps (otherwise a post-swap balance refresh would restart the quote
  // debounce even though the amount was just cleared).
  const tokenInBalanceRef = useRef(state.tokenInBalance)
  // Latest direction, read inside bootstrapSdk without adding state.direction to
  // its deps (which would re-initialize the SDK on every buy/sell toggle).
  const directionRef = useRef(state.direction)
  // Real exit contribution from the reserve stats, surfaced in the quote.
  const exitContributionRef = useRef('0%')
  // Status to restore when an overlay (slippage sheet / confirm dialog) is
  // dismissed, so cancelling does not lie about the underlying quote state
  // (e.g. returning to quote_ready when the user was at insufficient_balance).
  const previousStatusRef = useRef<ReserveSwapWidgetAdapterState['status']>('idle')
  const mountedRef = useRef(true)

  useEffect(() => {
    tokenInBalanceRef.current = state.tokenInBalance
  }, [state.tokenInBalance])

  useEffect(() => {
    directionRef.current = state.direction
  }, [state.direction])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const applyStatePatch = useCallback((patch: Partial<ReserveSwapWidgetAdapterState>) => {
    if (!mountedRef.current) return
    setState((current) => ({ ...current, ...patch }))
  }, [])

  const chainSupported = chainId !== null && SUPPORTED_RESERVE_CHAINS.includes(chainId as never)

  const reserveEnvironment = chainId === XDC_CHAIN_ID ? 'development' : 'production'

  const refreshBalances = useCallback(async () => {
    if (!address || !sdkRef.current || !readClientRef.current) return

    const stableToken = sdkRef.current.getStableTokenAddress()
    const gdToken = sdkRef.current.getGoodDollarAddress()
    const [stable, gd] = await Promise.all([
      readClientRef.current.readContract({
        address: stableToken,
        abi: erc20BalanceOfAbi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      }),
      readClientRef.current.readContract({
        address: gdToken,
        abi: erc20BalanceOfAbi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      }),
    ])

    const stableBalance = formatUnits(stable, decimalsRef.current.stable)
    const gdBalance = formatUnits(gd, decimalsRef.current.gd)
    balancesRef.current = { stable: stableBalance, gd: gdBalance }

    if (!mountedRef.current) return
    setState((current) => ({
      ...current,
      ...balancesForDirection(current.direction, stableBalance, gdBalance),
    }))
  }, [address])

  const bootstrapSdk = useCallback(async () => {
    if (!provider || !address || !chainId || !chainSupported) return

    // Drop any SDK/client bound to a previous chain so a Celo<->XDC switch
    // re-initializes against the new chain instead of reusing stale clients.
    sdkRef.current = null
    readClientRef.current = null

    applyStatePatch({ status: 'sdk_initializing', hasProvider: true, error: null })

    const constructor = await loadGoodReserveSdkConstructor()
    if (!constructor) {
      applyStatePatch({
        status: 'quote_error',
        error:
          'GoodReserve SDK is not available in this environment. Install @goodsdks/good-reserve to enable live swaps.',
      })
      return
    }

    try {
      const chain = RESERVE_CHAINS[chainId]
      const transport = custom(provider as Parameters<typeof custom>[0])
      // Pass the chain so publicClient.chain.id is populated; the SDK
      // constructor validates it and throws on a chainless client.
      const publicClient = createPublicClient({ chain, transport })
      const walletClient = createWalletClient({
        account: address as `0x${string}`,
        chain,
        transport,
      })

      const sdk = new constructor(publicClient, walletClient, reserveEnvironment)
      const stats = await sdk.getReserveStats()

      sdkRef.current = sdk
      readClientRef.current = publicClient as unknown as Erc20ReadClient
      decimalsRef.current = {
        // Chain-aware fallback: XDC's stable token (USDC) is 6 decimals, Celo's
        // (USDm) is 18. Only used if the SDK stats omit the value.
        stable:
          stats.stableTokenDecimals ?? (chainId === XDC_CHAIN_ID ? 6 : DEFAULT_STABLE_DECIMALS),
        gd: stats.goodDollarDecimals ?? DEFAULT_GD_DECIMALS,
      }
      // Preserve the real exit contribution so the quote can display it instead
      // of a hardcoded 0%.
      exitContributionRef.current =
        stats.exitContribution != null ? `${(stats.exitContribution * 100).toFixed(2)}%` : '0%'

      await refreshBalances()
      // Read direction via ref so toggling buy/sell does not re-bootstrap the SDK.
      const stableSymbol = getStableSymbol(chainId)
      const dir = directionRef.current
      applyStatePatch({
        status: 'idle',
        tokenInSymbol: dir === 'buy' ? stableSymbol : 'G$',
        tokenOutSymbol: dir === 'buy' ? 'G$' : stableSymbol,
        warning: null,
        error: null,
      })
    } catch (err: unknown) {
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
    provider,
    refreshBalances,
    reserveEnvironment,
  ])

  useEffect(() => {
    if (mockState) return

    if (!provider || !isConnected || !address) {
      sdkRef.current = null
      readClientRef.current = null
      applyStatePatch({
        ...initialState,
        status: 'no_provider',
        hasProvider: Boolean(provider),
      })
      return
    }

    applyStatePatch({ address, chainId, hasProvider: true })

    if (!chainSupported) {
      applyStatePatch({ status: 'unsupported_chain', error: null })
      return
    }

    void bootstrapSdk()
  }, [address, applyStatePatch, bootstrapSdk, chainId, chainSupported, isConnected, mockState, provider])

  useEffect(() => {
    if (mockState || !sdkRef.current) return
    if (!state.inputAmount) {
      applyStatePatch({ quote: null, warning: null, error: null, status: 'idle' })
      return
    }

    const inDecimals =
      state.direction === 'buy' ? decimalsRef.current.stable : decimalsRef.current.gd
    const outDecimals =
      state.direction === 'buy' ? decimalsRef.current.gd : decimalsRef.current.stable

    // Parse the amount in BigInt base units once; reject anything parseUnits
    // can't handle (avoids float precision in the gate and balance comparison).
    let input: bigint
    try {
      input = parseUnits(state.inputAmount, inDecimals)
    } catch {
      applyStatePatch({ quote: null, status: 'amount_editing' })
      return
    }
    if (input <= 0n) {
      applyStatePatch({ quote: null, status: 'amount_editing' })
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        // BigInt balance comparison — no float rounding at the last decimal.
        let balanceBigInt: bigint
        try {
          balanceBigInt = parseUnits(tokenInBalanceRef.current, inDecimals)
        } catch {
          balanceBigInt = 0n
        }
        if (input > balanceBigInt) {
          applyStatePatch({
            status: 'insufficient_balance',
            warning: 'Input exceeds your available token balance.',
            quote: null,
            error: null,
          })
          return
        }

        applyStatePatch({ status: 'quote_loading', warning: null, error: null })
        const stableToken = sdkRef.current!.getStableTokenAddress()
        const output =
          state.direction === 'buy'
            ? await sdkRef.current!.getBuyQuote(stableToken, input)
            : await sdkRef.current!.getSellQuote(input, stableToken)

        // Slippage and minimum-received are derived in BigInt so the value shown
        // to the user is exactly the minReturn submitted on-chain (no float drift).
        const slippageBps = BigInt(Math.round(state.slippagePercent * 100))
        const minReturn = (output * (10_000n - slippageBps)) / 10_000n

        const outputFormatted = formatUnits(output, outDecimals)
        const minReceivedFormatted = formatUnits(minReturn, outDecimals)
        // Display-only price (input per output); on-chain math stays BigInt-pure.
        const inputNum = Number(formatUnits(input, inDecimals))
        const outputNum = Number(outputFormatted)
        const price = outputNum === 0 ? '0.00000' : (inputNum / outputNum).toFixed(5)

        applyStatePatch({
          status: 'quote_ready',
          quote: {
            outputAmount: outputFormatted,
            price,
            minimumReceived: minReceivedFormatted,
            minReturnRaw: minReturn.toString(),
            // Price impact is not exposed by the SDK quote; show N/A rather than
            // a misleading constant. Exit contribution comes from reserve stats.
            priceImpactPercent: 'N/A',
            exitContributionPercent: exitContributionRef.current,
          },
          quoteExpiresAt: Date.now() + QUOTE_TTL_MS,
          error: null,
        })
      } catch (err: unknown) {
        applyStatePatch({
          status: 'quote_error',
          quote: null,
          error: mapReserveError(err, 'Failed to fetch reserve quote.'),
        })
      }
    }, QUOTE_DEBOUNCE_MS)

    return () => clearTimeout(timeoutId)
    // Note: tokenInBalance is intentionally read via ref (not a dep) so a
    // post-swap/direction-toggle balance update does not restart the debounce.
  }, [applyStatePatch, mockState, state.direction, state.inputAmount, state.slippagePercent])

  const actions = useMemo(
    () => ({
      connect: async () => {
        await connect()
      },
      switchChain: async (targetChainId: number) => {
        const walletProvider = provider as
          | { request?: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
          | undefined
        if (!walletProvider?.request) {
          applyStatePatch({ error: 'No wallet available to switch networks.' })
          return
        }
        try {
          await walletProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${targetChainId.toString(16)}` }],
          })
        } catch (err: unknown) {
          // 4902 = chain not added to the wallet; surface a clear message rather
          // than letting the rejection bubble unhandled out of the CTA handler.
          applyStatePatch({
            error: mapReserveError(err, 'Could not switch network. Add the network in your wallet and retry.'),
          })
        }
      },
      setDirection: (direction: ReserveSwapDirection) => {
        const stableSymbol = getStableSymbol(chainId)
        applyStatePatch({
          direction,
          tokenInSymbol: direction === 'buy' ? stableSymbol : 'G$',
          tokenOutSymbol: direction === 'buy' ? 'G$' : stableSymbol,
          // Remap the cached on-chain balances to the new in/out slots so the
          // "from" balance and MAX always reflect the spent token.
          ...balancesForDirection(direction, balancesRef.current.stable, balancesRef.current.gd),
          inputAmount: '',
          quote: null,
          status: 'idle',
          error: null,
          warning: null,
          // Clear any prior swap result so it cannot leak into the next swap.
          txHash: null,
          lastSwapOutput: null,
        })
      },
      setInputAmount: (value: string) => {
        const clean = sanitizeAmount(value)
        applyStatePatch({ inputAmount: clean, status: clean ? 'amount_editing' : 'idle' })
      },
      setMaxAmount: () => {
        // Balance is formatUnits output; sanitize so it is always parseUnits-safe.
        applyStatePatch({
          inputAmount: sanitizeAmount(state.tokenInBalance),
          status: 'amount_editing',
        })
      },
      setSlippagePercent: (value: number) => {
        // Keep the underlying quote/idle context instead of forcing idle.
        applyStatePatch({ slippagePercent: value, status: previousStatusRef.current })
      },
      openSlippage: () => {
        if (state.status !== 'slippage_selection' && state.status !== 'confirm_dialog') {
          previousStatusRef.current = state.status
        }
        applyStatePatch({ status: 'slippage_selection' })
      },
      closeSlippage: () => {
        applyStatePatch({ status: previousStatusRef.current })
      },
      openConfirm: () => {
        if (state.status !== 'confirm_dialog' && state.status !== 'slippage_selection') {
          previousStatusRef.current = state.status
        }
        applyStatePatch({ status: 'confirm_dialog' })
      },
      closeConfirm: () => {
        applyStatePatch({ status: previousStatusRef.current })
      },
      executeSwap: async () => {
        if (!sdkRef.current || !state.quote || !state.inputAmount) return
        // Guard against double submission while a swap is already in flight.
        if (state.status === 'swap_pending') return
        // Reject a stale quote: reserve prices move, so a minReturn derived from
        // an old quote may no longer be safe. Force a refresh instead of signing.
        if (state.quoteExpiresAt !== null && Date.now() > state.quoteExpiresAt) {
          // Keep the entered amount and drop back to editing so the debounced
          // quote effect re-fetches a fresh quote automatically (one-tap re-quote).
          applyStatePatch({
            status: 'amount_editing',
            quote: null,
            quoteExpiresAt: null,
            warning: 'Quote refreshed — review the new amount before confirming.',
          })
          return
        }
        // Re-validate chain support: the user may have switched to an
        // unsupported chain in their wallet while the confirm dialog was open.
        if (!chainSupported) {
          applyStatePatch({ status: 'unsupported_chain', error: null })
          return
        }
        try {
          applyStatePatch({ status: 'swap_pending', error: null })
          const stableToken = sdkRef.current.getStableTokenAddress()
          const amountIn = parseUnits(
            state.inputAmount,
            state.direction === 'buy' ? decimalsRef.current.stable : decimalsRef.current.gd,
          )
          // Reuse the exact minReturn that produced the displayed minimumReceived
          // so the on-chain floor matches what the user reviewed.
          const minReturn = state.quote.minReturnRaw
            ? BigInt(state.quote.minReturnRaw)
            : (() => {
                const quoteOut = parseUnits(
                  state.quote!.outputAmount,
                  state.direction === 'buy' ? decimalsRef.current.gd : decimalsRef.current.stable,
                )
                const slippageBps = BigInt(Math.round(state.slippagePercent * 100))
                return (quoteOut * (10_000n - slippageBps)) / 10_000n
              })()

          const result =
            state.direction === 'buy'
              ? await sdkRef.current.buy(stableToken, amountIn, minReturn)
              : await sdkRef.current.sell(stableToken, amountIn, minReturn)

          // Surface success first; balance refresh is best-effort so an RPC blip
          // cannot turn a confirmed swap into a swap_error. Preserve the quoted
          // output as lastSwapOutput before clearing the quote, so the success
          // screen shows the amount received (not the wallet balance).
          applyStatePatch({
            status: 'swap_success',
            txHash: result.hash,
            lastSwapOutput: state.quote.outputAmount,
            inputAmount: '',
            quote: null,
          })
          refreshBalances().catch((refreshErr) => {
            console.error('post-swap balance refresh failed', refreshErr)
          })
        } catch (err: unknown) {
          applyStatePatch({
            status: 'swap_error',
            error: mapReserveError(err, 'Swap failed.'),
          })
        }
      },
      refresh: async () => {
        if (mockState) return
        await bootstrapSdk()
      },
    }),
    [
      applyStatePatch,
      bootstrapSdk,
      connect,
      mockState,
      provider,
      refreshBalances,
      state.direction,
      state.inputAmount,
      state.quote,
      state.quoteExpiresAt,
      state.slippagePercent,
      state.status,
      state.tokenInBalance,
      chainId,
      chainSupported,
    ],
  )

  return { state: { ...state, ...(mockState ?? {}) }, actions }
}
