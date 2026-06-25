import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '@goodwidget/core'
import { erc20ABI } from '@goodsdks/good-reserve'
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
  XDC_CHAIN_ID,
} from './constants'
import { mapReserveError } from './errors'
import { sanitizeAmount } from './amount'
import { GoodReserveSDK, getReserveChainFromId } from '@goodsdks/good-reserve'

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

  const sdkRef = useRef<GoodReserveSDK | null>(null)
  // viem public client retained for ERC20 balance reads (the SDK has
  // getGDBalance but no helper for the arbitrary stable token).
  const publicClientRef = useRef<ReturnType<typeof createPublicClient> | null>(null)
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
  // Latest status, read inside the quote effect's empty-input guard without
  // adding state.status to its deps (which would re-arm the debounce on every
  // transition). Lets the guard avoid clobbering terminal swap states.
  const statusRef = useRef(state.status)
  const mountedRef = useRef(true)

  useEffect(() => {
    statusRef.current = state.status
  }, [state.status])

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

  const reserveEnvironment = chainId === XDC_CHAIN_ID ? 'development' : 'production'

  // Drive the supported-chain check from the SDK's own validator, which
  // accounts for env-specific availability (e.g. XDC reserve contracts are
  // only deployed in 'development'). getReserveChainFromId handles the case
  // where the SDK is reachable but the chain isn't valid for the current env.
  const chainSupported =
    chainId !== null &&
    (GoodReserveSDK.isChainEnvSupported(chainId, reserveEnvironment) ||
      getReserveChainFromId(chainId) !== null)

  const refreshBalances = useCallback(async () => {
    if (!address || !sdkRef.current || !publicClientRef.current) return

    const sdk = sdkRef.current
    const stableToken = sdk.getStableTokenAddress()
    const [stable, gd] = await Promise.all([
      // Stable-token balance via direct ERC20 read (the SDK has no helper for it).
      publicClientRef.current.readContract({
        address: stableToken,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      }) as Promise<bigint>,
      // G$ balance via the SDK helper.
      sdk.getGDBalance(address as `0x${string}`),
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

  // Reads the wallet's CURRENT chain id directly via eth_chainId, rather than
  // trusting React-derived `chainId` state which may lag a mid-dialog wallet
  // network switch. Returns null when no provider/request is available so the
  // caller can fall back to the memoized flag.
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

  const bootstrapSdk = useCallback(async () => {
    if (!provider || !address || !chainId || !chainSupported) return

    // Drop any SDK/client bound to a previous chain so a Celo<->XDC switch
    // re-initializes against the new chain instead of reusing stale clients.
    sdkRef.current = null
    publicClientRef.current = null

    applyStatePatch({ status: 'sdk_initializing', hasProvider: true, error: null })

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

      // exactApproval: true approves only the swap amount each time (no
      // leftover allowance on the broker) — the right default for
      // swap-on-demand UX.
      const sdk = new GoodReserveSDK(publicClient, walletClient, reserveEnvironment, {
        exactApproval: true,
      })
      const stats = await sdk.getReserveStats()

      sdkRef.current = sdk
      publicClientRef.current = publicClient
      decimalsRef.current = {
        // Chain-aware fallback: XDC's stable token (USDC) is 6 decimals,
        // Celo's (USDm) is 18. Only used if the SDK stats omit the value.
        stable:
          stats.stableTokenDecimals ?? (chainId === XDC_CHAIN_ID ? 6 : DEFAULT_STABLE_DECIMALS),
        gd: stats.goodDollarDecimals ?? DEFAULT_GD_DECIMALS,
      }
      // exitContribution comes from the same Mento pool struct as
      // reserveRatio and is read unscaled by the SDK
      // (extractPoolStats → toNumber(pool[5])). The GoodSDKs demo renders
      // these pool fields as a percent with `/ 10000`
      // (apps/demo-reserve-swap/src/components/ReserveSwap.tsx: reserveRatio /
      // 10000); we follow the same convention: e.g. 5000 → "0.50%".
      exitContributionRef.current =
        stats.exitContribution != null
          ? `${(stats.exitContribution / 10_000).toFixed(2)}%`
          : '0%'

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
      publicClientRef.current = null
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
      // A successful swap clears inputAmount as part of its success patch, which
      // re-triggers this effect. Don't clobber terminal swap states (success/
      // error/pending) back to idle — only reset when we're in a quote/editing
      // context. Otherwise the success screen would flash and vanish.
      const current = statusRef.current
      if (
        current === 'swap_success' ||
        current === 'swap_error' ||
        current === 'swap_pending'
      ) {
        return
      }
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
        // Display-only unit price expressed as OUTPUT per INPUT, i.e. the rate
        // for "1 tokenIn = <price> tokenOut". On-chain math stays BigInt-pure.
        const inputNum = Number(formatUnits(input, inDecimals))
        const outputNum = Number(outputFormatted)
        const price = inputNum === 0 ? '0.00000' : (outputNum / inputNum).toFixed(5)

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
        // Re-validate chain support against the wallet's CURRENT chain, read
        // live rather than trusting the memoized chainId: the user may have
        // switched networks in their wallet while the confirm dialog was open.
        const activeChainId = await readActiveChainId()
        if (activeChainId !== null && getReserveChainFromId(activeChainId) === null) {
          applyStatePatch({ status: 'unsupported_chain', error: null })
          return
        }
        // Fall back to the memoized flag if the live read failed (no provider.request).
        if (activeChainId === null && !chainSupported) {
          applyStatePatch({ status: 'unsupported_chain', error: null })
          return
        }
        try {
          // Clear any prior txHash so a stale hash can't leak into this attempt.
          applyStatePatch({ status: 'swap_pending', error: null, txHash: null })
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

          // Capture the transaction hash immediately when submitted, then show
          // success without waiting for confirmation. This prevents the UI from
          // getting stuck in "Swapping..." for 30+ seconds while waiting for the
          // transaction to be mined on Celo.
          let resolveHash: (hash: `0x${string}`) => void
          const hashPromise = new Promise<`0x${string}`>((resolve) => {
            resolveHash = resolve
          })

          const onHash = (hash: `0x${string}`) => {
            resolveHash(hash)
          }

          // Start the transaction (don't await it yet)
          const txPromise =
            state.direction === 'buy'
              ? sdkRef.current.buy(stableToken, amountIn, minReturn, onHash)
              : sdkRef.current.sell(stableToken, amountIn, minReturn, onHash)

          // Wait for the hash to be captured (this happens immediately after writeContract)
          const txHash = await hashPromise

          // Show success immediately with the transaction hash
          applyStatePatch({
            status: 'swap_success',
            txHash,
            lastSwapOutput: state.quote.outputAmount,
            inputAmount: '',
            quote: null,
          })

          // Refresh balances in the background
          refreshBalances().catch((refreshErr) => {
            console.error('post-swap balance refresh failed', refreshErr)
          })

          // Let the transaction complete in the background
          txPromise.catch((err) => {
            console.error('Transaction failed after showing success:', err)
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
      readActiveChainId,
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
