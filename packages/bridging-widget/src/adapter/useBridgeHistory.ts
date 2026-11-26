import { useCallback, useEffect, useRef, useState } from 'react'
import type { Address, PublicClient } from 'viem'
import type { BridgeTransaction, BridgingSDK } from '@goodsdks/bridging-sdk'
import { SUPPORTED_CHAINS } from '@goodsdks/bridging-sdk'
import { mapBridgeError } from './errors'
import { buildTransactions, resolvePendingStatuses } from './historyTransactions'
import { loadBridgeHistory } from './historyQueries'

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
      ? current
      : { transactions: [], isLoading: true, error: null, isPartial: false })

    loadBridgeHistory(sdk, address, publicClients)
      .then(async ({ events, incompleteChainIds }) => ({ ...await buildTransactions(sdk, events), incompleteChainIds }))
      .then(({ transactions, isPartial, incompleteChainIds }) => {
        if (requestIdRef.current !== requestId) return
        const scanIncomplete = incompleteChainIds.length > 0
        const networks = incompleteChainIds.map((id) => SUPPORTED_CHAINS[id]?.name ?? String(id)).join(', ')
        setState((current) => ({
          transactions: scanIncomplete && sameIdentity
            ? [...transactions, ...current.transactions.filter((old) => !transactions.some((item) => item.hash === old.hash))]
                .sort((a, b) => b.timestamp - a.timestamp)
            : transactions,
          isLoading: false,
          error: scanIncomplete ? `History is incomplete for: ${networks}. Available transactions are shown.` : null,
          isPartial,
        }))
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== requestId) return
        setState((current) => ({
          transactions: sameIdentity ? current.transactions : [],
          isLoading: false,
          error: mapBridgeError(err, 'History could not be refreshed. Previously loaded entries are shown when available.'),
          isPartial: sameIdentity && current.isPartial,
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
