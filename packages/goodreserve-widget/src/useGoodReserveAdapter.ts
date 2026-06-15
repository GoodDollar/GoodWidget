import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '@goodwidget/core'
import { createPublicClient, createWalletClient, custom, formatUnits, parseUnits } from 'viem'
import type {
  ReserveSwapDirection,
  ReserveSwapWidgetAdapterResult,
  ReserveSwapWidgetAdapterState,
} from './widgetRuntimeContract'
import {
  DEFAULT_GD_DECIMALS,
  DEFAULT_SLIPPAGE_PERCENT,
  DEFAULT_STABLE_DECIMALS,
  QUOTE_DEBOUNCE_MS,
  SUPPORTED_RESERVE_CHAINS,
  XDC_CHAIN_ID,
} from './constants'
import { mapReserveError } from './errors'

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
  ) => Promise<{ receipt: { transactionHash: string } }>
  sell: (
    stableToken: `0x${string}`,
    amountIn: bigint,
    minReturn: bigint,
  ) => Promise<{ receipt: { transactionHash: string } }>
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
}

function getStableSymbol(chainId: number | null): string {
  return chainId === XDC_CHAIN_ID ? 'USDC' : 'USDm'
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
  const mountedRef = useRef(true)

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

    applyStatePatch({
      tokenInBalance: formatUnits(stable, decimalsRef.current.stable),
      tokenOutBalance: formatUnits(gd, decimalsRef.current.gd),
    })
  }, [address, applyStatePatch])

  const bootstrapSdk = useCallback(async () => {
    if (!provider || !address || !chainId || !chainSupported) return

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
      const transport = custom(provider as Parameters<typeof custom>[0])
      const publicClient = createPublicClient({ transport })
      const walletClient = createWalletClient({
        account: address as `0x${string}`,
        transport,
      })

      const sdk = new constructor(publicClient, walletClient, reserveEnvironment)
      const stats = await sdk.getReserveStats()

      sdkRef.current = sdk
      readClientRef.current = publicClient as unknown as Erc20ReadClient
      decimalsRef.current = {
        stable: stats.stableTokenDecimals ?? DEFAULT_STABLE_DECIMALS,
        gd: stats.goodDollarDecimals ?? DEFAULT_GD_DECIMALS,
      }

      await refreshBalances()
      applyStatePatch({
        status: 'idle_buy',
        tokenInSymbol: getStableSymbol(chainId),
        tokenOutSymbol: 'G$',
        warning: null,
        error: null,
      })
    } catch (err: unknown) {
      applyStatePatch({
        status: 'quote_error',
        error: mapReserveError(err, 'Failed to initialize GoodReserve SDK.'),
      })
    }
  }, [address, applyStatePatch, chainId, chainSupported, provider, refreshBalances, reserveEnvironment])

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
      applyStatePatch({ quote: null, warning: null, error: null, status: 'idle_buy' })
      return
    }

    const amount = Number(state.inputAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      applyStatePatch({ quote: null, status: 'amount_editing' })
      return
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const inputBalance = Number(state.tokenInBalance)
        if (Number.isFinite(inputBalance) && amount > inputBalance) {
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
        const inDecimals =
          state.direction === 'buy' ? decimalsRef.current.stable : decimalsRef.current.gd
        const outDecimals =
          state.direction === 'buy' ? decimalsRef.current.gd : decimalsRef.current.stable
        const input = parseUnits(state.inputAmount, inDecimals)
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

        applyStatePatch({
          status: 'quote_ready',
          quote: {
            outputAmount: outputFormatted,
            price: output === 0n ? '0.00000' : (amount / Number(outputFormatted || '1')).toFixed(5),
            minimumReceived: minReceivedFormatted,
            minReturnRaw: minReturn.toString(),
            priceImpactPercent: '~0.01%',
            exitContributionPercent: '0%',
          },
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

    return () => window.clearTimeout(timeoutId)
  }, [applyStatePatch, mockState, state.direction, state.inputAmount, state.slippagePercent, state.tokenInBalance])

  const actions = useMemo(
    () => ({
      connect: async () => {
        await connect()
      },
      switchChain: async (targetChainId: number) => {
        const walletProvider = provider as
          | { request?: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
          | undefined
        if (!walletProvider?.request) return
        await walletProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        })
      },
      setDirection: (direction: ReserveSwapDirection) => {
        const stableSymbol = getStableSymbol(chainId)
        applyStatePatch({
          direction,
          tokenInSymbol: direction === 'buy' ? stableSymbol : 'G$',
          tokenOutSymbol: direction === 'buy' ? 'G$' : stableSymbol,
          inputAmount: '',
          quote: null,
          status: direction === 'buy' ? 'idle_buy' : 'amount_editing',
          error: null,
          warning: null,
        })
      },
      setInputAmount: (value: string) => {
        applyStatePatch({ inputAmount: value, status: value ? 'amount_editing' : 'idle_buy' })
      },
      setMaxAmount: () => {
        applyStatePatch({ inputAmount: state.tokenInBalance, status: 'amount_editing' })
      },
      setSlippagePercent: (value: number) => {
        applyStatePatch({ slippagePercent: value, status: 'idle_buy' })
      },
      openSlippage: () => {
        applyStatePatch({ status: 'slippage_selection' })
      },
      closeSlippage: () => {
        applyStatePatch({ status: state.quote ? 'quote_ready' : 'idle_buy' })
      },
      openConfirm: () => {
        applyStatePatch({ status: 'confirm_dialog' })
      },
      closeConfirm: () => {
        applyStatePatch({ status: state.quote ? 'quote_ready' : 'idle_buy' })
      },
      executeSwap: async () => {
        if (!sdkRef.current || !state.quote || !state.inputAmount) return
        // Guard against double submission while a swap is already in flight.
        if (state.status === 'swap_pending') return
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
          // cannot turn a confirmed swap into a swap_error.
          applyStatePatch({
            status: 'swap_success',
            txHash: result.receipt.transactionHash,
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
      state.slippagePercent,
      state.status,
      state.tokenInBalance,
      chainId,
      chainSupported,
    ],
  )

  return { state: { ...state, ...(mockState ?? {}) }, actions }
}
