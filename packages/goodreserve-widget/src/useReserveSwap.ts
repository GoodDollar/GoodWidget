import { useCallback } from 'react'
import { parseUnits } from 'viem'
import { getReserveChainFromId } from '@goodsdks/good-reserve'
import type { ReserveSwapWidgetAdapterState } from './widgetRuntimeContract'
import { mapReserveError } from './errors'
import type { ReserveRefs } from './useReserveBootstrap'

// ---------------------------------------------------------------------------
// Swap execution sub-hook.
//
// Responsibilities:
//   - Stale-quote guard (QUOTE_TTL_MS).
//   - Live chain re-validation before signing.
//   - buy() / sell() SDK call with onHash immediate feedback.
//   - Success / error state transitions.
// ---------------------------------------------------------------------------
export function useReserveSwap(
  refs: ReserveRefs,
  state: ReserveSwapWidgetAdapterState,
  applyStatePatch: (patch: Partial<ReserveSwapWidgetAdapterState>) => void,
  chainSupported: boolean,
  readActiveChainId: () => Promise<number | null>,
  refreshBalances: () => Promise<void>,
) {
  return useCallback(async () => {
    if (!refs.sdkRef.current || !state.quote || !state.inputAmount) return
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

    // Re-validate chain support against the wallet's CURRENT chain, read live
    // rather than trusting the memoized chainId: the user may have switched
    // networks in their wallet while the confirm dialog was open.
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
      const stableToken = refs.sdkRef.current.getStableTokenAddress()
      const amountIn = parseUnits(
        state.inputAmount,
        state.direction === 'buy' ? refs.decimalsRef.current.stable : refs.decimalsRef.current.gd,
      )

      // Reuse the exact minReturn that produced the displayed minimumReceived
      // so the on-chain floor matches what the user reviewed.
      const minReturn = state.quote.minReturnRaw
        ? BigInt(state.quote.minReturnRaw)
        : (() => {
            const quoteOut = parseUnits(
              state.quote!.outputAmount,
              state.direction === 'buy' ? refs.decimalsRef.current.gd : refs.decimalsRef.current.stable,
            )
            const slippageBps = BigInt(Math.round(state.slippagePercent * 100))
            return (quoteOut * (10_000n - slippageBps)) / 10_000n
          })()

      // onHash provides the hash immediately for logging/UI feedback.
      // We still wait for the receipt before showing success.
      const onHash = (hash: `0x${string}`) => {
        applyStatePatch({ txHash: hash })
      }

      const result =
        state.direction === 'buy'
          ? await refs.sdkRef.current.buy(stableToken, amountIn, minReturn, onHash)
          : await refs.sdkRef.current.sell(stableToken, amountIn, minReturn, onHash)

      applyStatePatch({
        status: 'swap_success',
        txHash: result.hash,
        lastSwapOutput: state.quote.outputAmount,
        inputAmount: '',
        quote: null,
      })

      // Refresh balances post-swap (non-blocking — success screen is already shown).
      refreshBalances().catch((err) => {
        console.error('post-swap balance refresh failed', err)
      })
    } catch (err: unknown) {
      applyStatePatch({
        status: 'swap_error',
        error: mapReserveError(err, 'Swap failed.'),
      })
    }
  }, [
    applyStatePatch,
    chainSupported,
    readActiveChainId,
    refreshBalances,
    refs,
    state.direction,
    state.inputAmount,
    state.quote,
    state.quoteExpiresAt,
    state.slippagePercent,
    state.status,
  ])
}
