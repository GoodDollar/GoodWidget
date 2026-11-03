import { useEffect, useRef, useState } from 'react'
import { parseUnits, type Address } from 'viem'
import type { BridgeFeeQuote, BridgeProtocol, BridgeRequirement, BridgingSDK } from '@goodsdks/bridging-sdk'
import { getChainDecimals } from './chains'
import { mapBridgeError } from './errors'

const QUOTE_DEBOUNCE_MS = 400

export type BridgeQuoteStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface BridgeQuoteState {
  status: BridgeQuoteStatus
  quote: BridgeFeeQuote | null
  needsApproval: boolean
  canBridge: boolean
  requirements: BridgeRequirement[]
  error: string | null
}

const IDLE_STATE: BridgeQuoteState = {
  status: 'idle',
  quote: null,
  needsApproval: false,
  canBridge: false,
  requirements: [],
  error: null,
}

interface UseBridgeQuoteArgs {
  sdk: BridgingSDK | null
  sender: Address | null
  fromChain: number | null
  toChain: number | null
  protocol: BridgeProtocol | null
  inputAmount: string
}

// Debounced wrapper around BridgingSDK.getQuote: re-fetches whenever the
// amount or route changes, and discards any in-flight response that's no
// longer current so a fast retype can't let a stale quote win the race.
export function useBridgeQuote({
  sdk,
  sender,
  fromChain,
  toChain,
  protocol,
  inputAmount,
}: UseBridgeQuoteArgs): BridgeQuoteState {
  const queryKey = `${sender}:${fromChain}:${toChain}:${protocol}:${inputAmount}`
  const [state, setState] = useState<{ queryKey: string; sdk: BridgingSDK | null; result: BridgeQuoteState }>({
    queryKey: '', sdk: null, result: IDLE_STATE,
  })
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!sdk || !sender || fromChain === null || toChain === null || !protocol || !inputAmount) {
      requestIdRef.current += 1
      setState({ queryKey, sdk, result: IDLE_STATE })
      return
    }

    let amount: bigint
    try {
      amount = parseUnits(inputAmount, getChainDecimals(fromChain))
    } catch {
      requestIdRef.current += 1
      setState({ queryKey, sdk, result: IDLE_STATE })
      return
    }
    if (amount <= 0n) {
      requestIdRef.current += 1
      setState({ queryKey, sdk, result: IDLE_STATE })
      return
    }

    const requestId = ++requestIdRef.current
    setState({ queryKey, sdk, result: { ...IDLE_STATE, status: 'loading' } })

    const timeoutId = setTimeout(async () => {
      try {
        const result = await sdk.getQuote({ sender, amount, fromChain, toChain, protocol })
        if (requestIdRef.current !== requestId) return
        setState({ queryKey, sdk, result: {
          status: 'ready',
          quote: result.quote,
          needsApproval: result.needsApproval,
          canBridge: result.canBridge,
          requirements: result.requirements,
          error: null,
        } })
      } catch (err: unknown) {
        if (requestIdRef.current !== requestId) return
        setState({ queryKey, sdk, result: {
          ...IDLE_STATE,
          status: 'error',
          error: mapBridgeError(err, 'Failed to fetch bridge quote.'),
        } })
      }
    }, QUOTE_DEBOUNCE_MS)

    return () => clearTimeout(timeoutId)
  }, [sdk, sender, fromChain, toChain, protocol, inputAmount, queryKey])

  // Effects run after render. Hide the old route's quote immediately on the
  // first render with changed inputs, before a user could click Review.
  if (state.queryKey !== queryKey || state.sdk !== sdk) {
    return sdk && sender && fromChain !== null && toChain !== null && protocol && inputAmount
      ? { ...IDLE_STATE, status: 'loading' }
      : IDLE_STATE
  }
  return state.result
}
