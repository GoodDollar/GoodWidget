import { useCallback, useEffect, useRef, useState } from 'react'
import type { Address, PublicClient } from 'viem'
import type { BridgeTransaction, BridgingSDK } from '@goodsdks/bridging-sdk'
import { mapBridgeError } from './errors'
import { buildTransactions, resolvePendingStatuses } from './historyTransactions'

const HISTORY_EVENT_LIMIT = 50
const HISTORY_POLL_INTERVAL_MS = 15_000

export interface BridgeHistoryState {
  transactions: BridgeTransaction[]
  isLoading: boolean
  error: string | null
  /** True when a status lookup failed and its entry remains pending. */
  isPartial: boolean
}

const EMPTY_STATE: BridgeHistoryState = { transactions: [], isLoading: false, error: null, isPartial: false }

interface UseBridgeHistoryArgs {
  sdk: BridgingSDK | null
  address: Address | null
  publicClients: Record<number, PublicClient>
}

// Scan all chains on initial load, account change, or explicit refresh. A
// 15-second pending poll checks explorer statuses only and leaves the list up.
export function useBridgeHistory({ sdk, address, publicClients }: UseBridgeHistoryArgs): BridgeHistoryState & {
  refresh: () => void
} {
  const [state, setState] = useState<BridgeHistoryState>(EMPTY_STATE)
  const requestIdRef = useRef(0)
  const identityRef = useRef<{ sdk: BridgingSDK | null; address: Address | null }>({ sdk: null, address: null })
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    if (!sdk || !address) {
      requestIdRef.current += 1
      identityRef.current = { sdk, address }
      setState(EMPTY_STATE)
      return
    }

    const requestId = ++requestIdRef.current
    const sameIdentity = identityRef.current.sdk === sdk && identityRef.current.address === address
    identityRef.current = { sdk, address }
    setState((current) => sameIdentity && current.transactions.length > 0
      ? { ...current, error: null }
      : { transactions: [], isLoading: true, error: null, isPartial: false })

    sdk.getCombinedHistory(address, publicClients, { limit: HISTORY_EVENT_LIMIT })
      .then((events) => buildTransactions(sdk, events))
      .then(({ transactions, isPartial }) => {
        if (requestIdRef.current !== requestId) return
        transactions.sort((a, b) => b.timestamp - a.timestamp)
        setState({ transactions, isLoading: false, error: null, isPartial })
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== requestId) return
        setState((current) => ({
          transactions: sameIdentity ? current.transactions : [],
          isLoading: false,
          error: mapBridgeError(err, 'Unable to load bridge history.'),
          isPartial: sameIdentity && current.transactions.length > 0,
        }))
      })
  }, [sdk, address, publicClients, refreshToken])

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), [])

  // A failed explicit scan preserves the same transactions array but still
  // advances requestIdRef. Restart polling with that new request ID.
  useEffect(() => {
    if (!sdk || !address) return
    const pending = state.transactions.filter((transaction) => transaction.status.status === 'pending')
    if (pending.length === 0) return
    const requestId = requestIdRef.current
    let polling = false
    let active = true
    const intervalId = setInterval(async () => {
      if (polling) return
      polling = true
      const result = await resolvePendingStatuses(sdk, pending)
      polling = false
      if (!active || requestIdRef.current !== requestId) return
      const updated = new Map(result.transactions.map((transaction) => [transaction.hash, transaction]))
      setState((current) => ({
        ...current,
        transactions: current.transactions.map((transaction) => updated.get(transaction.hash) ?? transaction),
        isPartial: result.isPartial,
      }))
    }, HISTORY_POLL_INTERVAL_MS)
    return () => {
      active = false
      clearInterval(intervalId)
    }
  }, [sdk, address, publicClients, refreshToken, state.transactions])

  return { ...state, refresh }
}
