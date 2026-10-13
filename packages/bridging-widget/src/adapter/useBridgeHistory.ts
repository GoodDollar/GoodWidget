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

export interface BridgeHistoryState {
  transactions: BridgeTransaction[]
  isLoading: boolean
  error: string | null
}

const EMPTY_STATE: BridgeHistoryState = { transactions: [], isLoading: false, error: null }

function isRequestEvent(
  event: BridgeRequestEvent | ExecutedTransferEvent,
): event is BridgeRequestEvent {
  return 'targetChainId' in event.args
}

// getCombinedHistory returns the raw on-chain events for both legs of a
// bridge (the source-chain request and, once delivered, the destination-chain
// transfer) deduplicated across chains, but not paired up or resolved to a
// delivery status. Groups them by the shared request id so each bridge
// appears once, then normalizes into the SDK's own BridgeTransaction shape.
async function buildTransactions(
  sdk: BridgingSDK,
  events: (BridgeRequestEvent | ExecutedTransferEvent)[],
): Promise<BridgeTransaction[]> {
  const requestById = new Map<string, BridgeRequestEvent>()
  const executedById = new Map<string, ExecutedTransferEvent>()

  for (const event of events) {
    const key = `${event.args.bridge}:${event.args.id.toString()}`
    if (isRequestEvent(event)) {
      requestById.set(key, event)
    } else {
      executedById.set(key, event)
    }
  }

  const keys = new Set([...requestById.keys(), ...executedById.keys()])

  return Promise.all(
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
    setState({ transactions: [], isLoading: true, error: null })

    sdk
      .getCombinedHistory(address, publicClients, { limit: HISTORY_EVENT_LIMIT })
      .then((events) => buildTransactions(sdk, events))
      .then((transactions) => {
        if (requestIdRef.current !== requestId) return
        transactions.sort((a, b) => b.timestamp - a.timestamp)
        setState({ transactions, isLoading: false, error: null })
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== requestId) return
        setState({
          transactions: [],
          isLoading: false,
          error: mapBridgeError(err, 'Unable to load bridge history.'),
        })
      })
  }, [sdk, address, publicClients, refreshToken])

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), [])

  return { ...state, refresh }
}
