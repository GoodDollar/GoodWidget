import { useEffect } from 'react'
import { formatUnits, parseUnits } from 'viem'
import type { ReserveSwapWidgetAdapterState } from './widgetRuntimeContract'
import { QUOTE_DEBOUNCE_MS, QUOTE_TTL_MS } from './constants'
import { mapReserveError } from './errors'
import type { ReserveRefs } from './useReserveBootstrap'

// ---------------------------------------------------------------------------
// Quote pipeline sub-hook.
//
// Responsibilities:
//   - Debounce the user's input amount.
//   - Validate parseability and BigInt balance gate.
//   - Call the SDK quote methods (getBuyQuote / getSellQuote).
//   - Derive display values: outputAmount, price, minimumReceived, minReturnRaw.
//   - Advance status: amount_editing → quote_loading → quote_ready / quote_error.
// ---------------------------------------------------------------------------
export function useReserveQuote(
  refs: ReserveRefs,
  state: ReserveSwapWidgetAdapterState,
  applyStatePatch: (patch: Partial<ReserveSwapWidgetAdapterState>) => void,
  mockState: Partial<ReserveSwapWidgetAdapterState> | undefined,
): void {
  useEffect(() => {
    if (mockState || !refs.sdkRef.current) return

    if (!state.inputAmount) {
      // A successful swap clears inputAmount as part of its success patch,
      // which re-triggers this effect. Don't clobber terminal swap states
      // (success/error/pending) back to idle.
      const current = refs.statusRef.current
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
      state.direction === 'buy' ? refs.decimalsRef.current.stable : refs.decimalsRef.current.gd
    const outDecimals =
      state.direction === 'buy' ? refs.decimalsRef.current.gd : refs.decimalsRef.current.stable

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
          balanceBigInt = parseUnits(refs.tokenInBalanceRef.current, inDecimals)
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
        const stableToken = refs.sdkRef.current!.getStableTokenAddress()
        const output =
          state.direction === 'buy'
            ? await refs.sdkRef.current!.getBuyQuote(stableToken, input)
            : await refs.sdkRef.current!.getSellQuote(input, stableToken)

        // Slippage and minimum-received are derived in BigInt so the value shown
        // to the user is exactly the minReturn submitted on-chain (no float drift).
        const slippageBps = BigInt(Math.round(state.slippagePercent * 100))
        const minReturn = (output * (10_000n - slippageBps)) / 10_000n

        const outputFormatted = formatUnits(output, outDecimals)
        const minReceivedFormatted = formatUnits(minReturn, outDecimals)
        // Display-only unit price: OUTPUT per INPUT (rate shown to user).
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
            exitContributionPercent: refs.exitContributionRef.current,
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
  }, [applyStatePatch, mockState, refs, state.direction, state.inputAmount, state.slippagePercent])
}
