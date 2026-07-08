import { useCallback, useMemo, useState } from 'react'
import type {
  ReserveSwapDirection,
  ReserveSwapWidgetAdapterResult,
  ReserveSwapWidgetAdapterState,
} from './widgetRuntimeContract'
import {
  DEFAULT_SLIPPAGE_PERCENT,
} from './constants'

import {
  balancesForDirection,
  getStableSymbol,
  useReserveBootstrap,
  useReserveRefSync,
  useReserveRefs,
} from './useReserveBootstrap'
import { useReserveQuote } from './useReserveQuote'
import { useReserveSwap } from './useReserveSwap'

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Public adapter — composes four focused sub-hooks:
//   useReserveBootstrap → SDK init, wallet, chain handling
//   useReserveQuote     → debounced quote pipeline
//   useReserveSwap      → swap execution flow
//   useMemo actions     → UI event adapters (setDirection, openConfirm, etc.)
// ---------------------------------------------------------------------------
export function useGoodReserveAdapter(
  mockState?: Partial<ReserveSwapWidgetAdapterState>,
): ReserveSwapWidgetAdapterResult {
  const [state, setState] = useState<ReserveSwapWidgetAdapterState>({
    ...initialState,
    ...mockState,
  })

  const refs = useReserveRefs(initialState.status, initialState.tokenInBalance, initialState.direction)

  // Guarded setState — ignores updates after unmount.
  const applyStatePatch = useCallback((patch: Partial<ReserveSwapWidgetAdapterState>) => {
    if (!refs.mountedRef.current) return
    setState((current) => {
      let hasChanges = false
      for (const key in patch) {
        if (current[key as keyof ReserveSwapWidgetAdapterState] !== patch[key as keyof ReserveSwapWidgetAdapterState]) {
          hasChanges = true
          break
        }
      }
      return hasChanges ? { ...current, ...patch } : current
    })
  }, [refs.mountedRef])

  // Sync critical state slices into refs for cross-effect reads.
  useReserveRefSync(refs, state)

  // 1. Bootstrap: wallet connection, SDK construction, chain handling.
  const { chainId, provider, chainSupported, connect, readActiveChainId, refreshBalances, bootstrapSdk } =
    useReserveBootstrap(refs, applyStatePatch, mockState)

  // 2. Quote pipeline: debounced input → SDK quote → display derivation.
  useReserveQuote(refs, state, applyStatePatch, mockState)

  // 3. Swap execution: stale-quote guard → buy/sell → success/error.
  const executeSwap = useReserveSwap(
    refs,
    state,
    applyStatePatch,
    chainSupported,
    readActiveChainId,
    refreshBalances,
  )

  // 4. UI action adapters — direction, amount, overlay, slippage, refresh.
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
          const e = err as { code?: number; message?: string }
          applyStatePatch({
            error:
              e?.code === 4902
                ? 'Network not added to your wallet. Add it and retry.'
                : (e?.message ?? 'Could not switch network.'),
          })
        }
      },
      setDirection: (direction: ReserveSwapDirection) => {
        const stableSymbol = getStableSymbol(chainId)
        applyStatePatch({
          direction,
          tokenInSymbol: direction === 'buy' ? stableSymbol : 'G$',
          tokenOutSymbol: direction === 'buy' ? 'G$' : stableSymbol,
          // Remap cached on-chain balances to the new in/out slots.
          ...balancesForDirection(direction, refs.balancesRef.current.stable, refs.balancesRef.current.gd),
          inputAmount: '',
          quote: null,
          status: 'idle',
          error: null,
          warning: null,
          txHash: null,
          lastSwapOutput: null,
        })
      },
      setInputAmount: (value: string) => {
        applyStatePatch({ inputAmount: value, status: value ? 'amount_editing' : 'idle' })
      },
      setMaxAmount: () => {
        applyStatePatch({
          inputAmount: state.tokenInBalance,
          status: 'amount_editing',
        })
      },
      setSlippagePercent: (value: number) => {
        // Restore the pre-overlay status so closing slippage returns to the
        // correct context (e.g. quote_ready, not idle).
        applyStatePatch({ slippagePercent: value, status: refs.previousStatusRef.current })
      },
      openSlippage: () => {
        if (state.status !== 'slippage_selection' && state.status !== 'confirm_dialog') {
          refs.previousStatusRef.current = state.status
        }
        applyStatePatch({ status: 'slippage_selection' })
      },
      closeSlippage: () => {
        applyStatePatch({ status: refs.previousStatusRef.current })
      },
      openConfirm: () => {
        if (state.status !== 'confirm_dialog' && state.status !== 'slippage_selection') {
          refs.previousStatusRef.current = state.status
        }
        applyStatePatch({ status: 'confirm_dialog' })
      },
      closeConfirm: () => {
        applyStatePatch({ status: refs.previousStatusRef.current })
      },
      executeSwap,
      refresh: async () => {
        if (mockState) return
        await bootstrapSdk()
      },
    }),
    [
      applyStatePatch,
      bootstrapSdk,
      chainId,
      connect,
      executeSwap,
      mockState,
      provider,
      refs,
      state.status,
      state.tokenInBalance,
    ],
  )

  return { state: { ...state, ...(mockState ?? {}) }, actions }
}
