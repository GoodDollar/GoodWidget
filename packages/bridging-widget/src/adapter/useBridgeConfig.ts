import { useEffect, useRef, useState } from 'react'
import type { Address } from 'viem'
import type { BridgeConfig, BridgeProtocol, BridgingSDK } from '@goodsdks/bridging-sdk'
import { mapBridgeError } from './errors'

export interface BridgeConfigState {
  config: BridgeConfig | null
  isLoading: boolean
  error: string | null
}

const EMPTY_STATE: BridgeConfigState = { config: null, isLoading: false, error: null }

interface UseBridgeConfigArgs {
  sdk: BridgingSDK | null
  address: Address | null
  fromChain: number | null
  toChain: number | null
  protocol: BridgeProtocol | null
}

// Loads the source balance, G$ protocol fee, and route limits for the
// selected route. Unlike useBridgeQuote this is not debounced on the amount
// field — it only needs to refetch when the route itself changes, so the
// Bridge tab can show a balance/limit hint before any amount is typed.
export function useBridgeConfig({
  sdk,
  address,
  fromChain,
  toChain,
  protocol,
}: UseBridgeConfigArgs): BridgeConfigState {
  const routeKey = `${address}:${fromChain}:${toChain}:${protocol}`
  const [state, setState] = useState<{ routeKey: string; sdk: BridgingSDK | null; result: BridgeConfigState }>({
    routeKey: '',
    sdk: null,
    result: EMPTY_STATE,
  })
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!sdk || !address) {
      requestIdRef.current += 1
      setState({ routeKey, sdk, result: EMPTY_STATE })
      return
    }

    const requestId = ++requestIdRef.current
    setState({ routeKey, sdk, result: { config: null, isLoading: true, error: null } })

    const route =
      fromChain !== null && toChain !== null && protocol
        ? { fromChain, toChain, protocol }
        : undefined

    sdk
      .getBridgeConfig(address, route)
      .then((config) => {
        if (requestIdRef.current !== requestId) return
        setState({ routeKey, sdk, result: { config, isLoading: false, error: null } })
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== requestId) return
        setState({
          routeKey,
          sdk,
          result: {
            config: null,
            isLoading: false,
            error: mapBridgeError(err, 'Unable to load balance and limits.'),
          },
        })
      })
  }, [sdk, address, fromChain, toChain, protocol, routeKey])

  // Effects reset asynchronously; never paint a balance or route limit that
  // belongs to the previous account/source chain in the meantime.
  if (state.routeKey !== routeKey || state.sdk !== sdk) {
    return sdk && address ? { config: null, isLoading: true, error: null } : EMPTY_STATE
  }
  return state.result
}
