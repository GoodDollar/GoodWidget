import { useCallback, useEffect, useRef, useState } from 'react'
import type { PublicClient } from 'viem'
import type { Address } from 'viem'
import type {
  BridgeRequestEvent,
  BridgeTransaction,
  BridgingSDK,
  ExecutedTransferEvent,
} from '@goodsdks/bridging-sdk'
import { mapBridgeError } from './errors'

const HISTORY_EVENT_LIMIT = 50
// While any transaction is still 'pending', poll for delivery updates instead
// of waiting for the user to tab away and back.
const HISTORY_POLL_INTERVAL_MS = 15_000

export interface BridgeHistoryState {
  transactions: BridgeTransaction[]
  isLoading: boolean
  error: string | null
  /** True when at least one event's delivery-status lookup failed and was
   *  dropped from `transactions` rather than blanking the whole list. */
  isPartial: boolean
}

const EMPTY_STATE: BridgeHistoryState = { transactions: [], isLoading: false, error: null, isPartial: false }

function isRequestEvent(
  event: BridgeRequestEvent | ExecutedTransferEvent,
): event is BridgeRequestEvent {
  return 'targetChainId' in event.args
}

interface BuildTransactionsResult {
  transactions: BridgeTransaction[]
  isPartial: boolean
}

// getCombinedHistory returns the raw on-chain events for both legs of a
// bridge (the source-chain request and, once delivered, the destination-chain
// transfer) deduplicated across chains, but not paired up or resolved to a
// delivery status. Groups them by bridge + source chain + request id (the id
// alone is only unique per source chain, not globally) so each bridge appears
// once, then normalizes into the SDK's own BridgeTransaction shape.
async function buildTransactions(
  sdk: BridgingSDK,
  events: (BridgeRequestEvent | ExecutedTransferEvent)[],
): Promise<BuildTransactionsResult> {
  const requestById = new Map<string, BridgeRequestEvent>()
  const executedById = new Map<string, ExecutedTransferEvent>()

  for (const event of events) {
    const sourceChainId = isRequestEvent(event) ? event.chainId : event.args.sourceChainId
    const key = `${event.args.bridge}:${sourceChainId}:${event.args.id.toString()}`
    if (isRequestEvent(event)) {
      requestById.set(key, event)
    } else {
      executedById.set(key, event)
    }
  }

  const keys = new Set([...requestById.keys(), ...executedById.keys()])

  // Each entry's delivery-status lookup hits an external explorer
  // (LayerZeroScan/Axelarscan) independently, so one slow/unavailable
  // explorer must not blank every other already-resolved entry. allSettled
  // keeps the entries that succeeded and flags the batch as partial instead.
  const settled = await Promise.allSettled(
    Array.from(keys, async (key): Promise<BridgeTransaction> => {
      const request = requestById.get(key)
      const executed = executedById.get(key)

      // Both legs landed: the transfer is complete and there is nothing left
      // to poll an external explorer for.
      if (request && executed) {
        return {
          hash: request.transactionHash,
          fromChainId: request.chainId,
          toChainId: request.args.targetChainId,
          amount: request.args.amount,
          protocol: request.args.bridge,
          status: { status: 'completed', srcTxHash: request.transactionHash, dstTxHash: executed.transactionHash },
          timestamp: request.timestamp,
        }
      }

      // Only the source-chain request has landed so far: ask the protocol's
      // explorer (LayerZeroScan/Axelarscan, via the SDK) whether delivery is
      // still pending, completed, or failed.
      if (request) {
        const status = await sdk.getTransactionStatus(request.transactionHash, request.args.bridge)
        return {
          hash: request.transactionHash,
          fromChainId: request.chainId,
          toChainId: request.args.targetChainId,
          amount: request.args.amount,
          protocol: request.args.bridge,
          status,
          timestamp: request.timestamp,
        }
      }

      // Only the destination-chain transfer is visible (the request event
      // fell outside the queried block range) — still enough to show a
      // completed entry. executed is guaranteed here: `keys` only contains
      // ids present in at least one of the two maps, and the request branch
      // above already covered every id with a request event.
      const transfer = executed as ExecutedTransferEvent
      return {
        hash: transfer.transactionHash,
        fromChainId: transfer.args.sourceChainId,
        toChainId: transfer.chainId,
        amount: transfer.args.amount,
        protocol: transfer.args.bridge,
        status: { status: 'completed', dstTxHash: transfer.transactionHash },
        timestamp: transfer.timestamp,
      }
    }),
  )

  const transactions: BridgeTransaction[] = []
  let isPartial = false
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      transactions.push(result.value)
    } else {
      isPartial = true
    }
  }

  return { transactions, isPartial }
}

interface UseBridgeHistoryArgs {
  sdk: BridgingSDK | null
  address: Address | null
  publicClients: Record<number, PublicClient>
}

// Loads and normalizes the connected wallet's bridge history across all
// supported chains. Mirrors useBridgeConfig's request-id guard so a stale
// response from a superseded address/sdk never overwrites a newer one.
export function useBridgeHistory({ sdk, address, publicClients }: UseBridgeHistoryArgs): BridgeHistoryState & {
  refresh: () => void
} {
  const [state, setState] = useState<BridgeHistoryState>(EMPTY_STATE)
  const requestIdRef = useRef(0)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    if (!sdk || !address) {
      requestIdRef.current += 1
      setState(EMPTY_STATE)
      return
    }

    const requestId = ++requestIdRef.current
    setState({ transactions: [], isLoading: true, error: null, isPartial: false })

    sdk
      .getCombinedHistory(address, publicClients, { limit: HISTORY_EVENT_LIMIT })
      .then((events) => buildTransactions(sdk, events))
      .then(({ transactions, isPartial }) => {
        if (requestIdRef.current !== requestId) return
        transactions.sort((a, b) => b.timestamp - a.timestamp)
        setState({ transactions, isLoading: false, error: null, isPartial })
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== requestId) return
        setState({
          transactions: [],
          isLoading: false,
          error: mapBridgeError(err, 'Unable to load bridge history.'),
          isPartial: false,
        })
      })
  }, [sdk, address, publicClients, refreshToken])

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), [])

  // Keep pending entries live without requiring the user to manually refresh:
  // poll on an interval for as long as at least one transaction is pending,
  // and stop automatically once every entry has settled.
  useEffect(() => {
    const hasPendingTransaction = state.transactions.some((transaction) => transaction.status.status === 'pending')
    if (!hasPendingTransaction) return

    const intervalId = setInterval(refresh, HISTORY_POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [state.transactions, refresh])

  return { ...state, refresh }
}
