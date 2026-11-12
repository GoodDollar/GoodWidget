import { useEffect, useRef, useState } from 'react'
import { parseUnits, type Address } from 'viem'
import type { BridgeFeeQuote, BridgeProtocol, BridgeRequirement, BridgingSDK } from '@goodsdks/bridging-sdk'
import { mapBridgeError } from './errors'

const QUOTE_DEBOUNCE_MS = 400

// G$ is an 18-decimal token on every bridged chain (BridgeRouteLimits docs
// its own amounts as "normalized G$ base units (18 decimals)").
const G_DOLLAR_DECIMALS = 18

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
  const [state, setState] = useState<BridgeQuoteState>(IDLE_STATE)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!sdk || !sender || fromChain === null || toChain === null || !protocol || !inputAmount) {
      requestIdRef.current += 1
      setState(IDLE_STATE)
      return
    }

    let amount: bigint
    try {
      amount = parseUnits(inputAmount, G_DOLLAR_DECIMALS)
    } catch {
      requestIdRef.current += 1
      setState(IDLE_STATE)
      return
    }
    if (amount <= 0n) {
      requestIdRef.current += 1
      setState(IDLE_STATE)
      return
    }

    const requestId = ++requestIdRef.current
    setState((current) => ({ ...current, status: 'loading', error: null }))

    const timeoutId = setTimeout(async () => {
      try {
        const result = await sdk.getQuote({ sender, amount, fromChain, toChain, protocol })
        if (requestIdRef.current !== requestId) return
        setState({
          status: 'ready',
          quote: result.quote,
          needsApproval: result.needsApproval,
          canBridge: result.canBridge,
          requirements: result.requirements,
          error: null,
        })
      } catch (err: unknown) {
        if (requestIdRef.current !== requestId) return
        setState({
          ...IDLE_STATE,
          status: 'error',
          error: mapBridgeError(err, 'Failed to fetch bridge quote.'),
        })
      }
    }, QUOTE_DEBOUNCE_MS)

    return () => clearTimeout(timeoutId)
  }, [sdk, sender, fromChain, toChain, protocol, inputAmount])

  return state
}
