import { useCallback } from 'react'
import { parseUnits } from 'viem'
import { getReserveChainFromId } from '@goodsdks/good-reserve'
import type { ReserveSwapWidgetAdapterState } from './widgetRuntimeContract'
import { QUOTE_REFRESHED_NOTICE } from './constants'
import { mapReserveError } from './errors'
import type { ReserveRefs } from './useReserveBootstrap'

// ---------------------------------------------------------------------------
// Swap execution sub-hook.
//
// Responsibilities:
//   - Stale-quote guard (QUOTE_TTL_MS) + automatic re-quote.
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
  requestQuoteRefresh: (notice: string | null) => void,
) {
  return useCallback(async () => {
    if (!refs.sdkRef.current || !state.quote || !state.inputAmount) return
    // Guard against double submission while a swap or approval is already in flight.
    if (state.status === 'swap_pending' || state.status === 'approval_pending') return

    // Reject a stale quote: reserve prices move, so a minReturn derived from
    // an old quote may no longer be safe. Force a refresh instead of signing.
    if (state.quoteExpiresAt !== null && Date.now() > state.quoteExpiresAt) {
      // Keep the entered amount and drop back to editing, then explicitly kick
      // the quote effect. It keys on inputAmount/direction/slippagePercent, none
      // of which this patch changes, so without the nonce bump it would never
      // re-run and the user would be stranded on a disabled "Review Swap".
      applyStatePatch({
        status: 'amount_editing',
        quote: null,
        quoteExpiresAt: null,
        warning: QUOTE_REFRESHED_NOTICE,
      })
      requestQuoteRefresh(QUOTE_REFRESHED_NOTICE)
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
      const sdk = refs.sdkRef.current
      const stableToken = sdk.getStableTokenAddress()
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

      const onHash = (hash: `0x${string}`) => {
        applyStatePatch({ txHash: hash })
      }

      const result =
        state.direction === 'buy'
          ? await sdk.buy(stableToken, amountIn, minReturn, onHash)
          : await sdk.sell(stableToken, amountIn, minReturn, onHash)

      // The SDK resolves on any mined receipt, reverted included, so a reverted
      // swap would otherwise render as "Swap Successful".
      if (result.receipt?.status !== 'success') {
        throw new Error('Swap transaction reverted on-chain.')
      }

      refs.quoteRefreshNoticeRef.current = null
      applyStatePatch({
        status: 'swap_success',
        txHash: result.hash,
        lastSwapOutput: state.quote.outputAmount,
        inputAmount: '',
        quote: null,
        warning: null,
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
    requestQuoteRefresh,
    state.direction,
    state.inputAmount,
    state.quote,
    state.quoteExpiresAt,
    state.slippagePercent,
    state.status,
  ])
}
