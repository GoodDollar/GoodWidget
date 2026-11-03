import type {
  BridgeRequestEvent,
  BridgeTransaction,
  BridgingSDK,
  ExecutedTransferEvent,
} from '@goodsdks/bridging-sdk'

type StatusClient = Pick<BridgingSDK, 'getTransactionStatus'>

function isRequestEvent(
  event: BridgeRequestEvent | ExecutedTransferEvent,
): event is BridgeRequestEvent {
  return 'targetChainId' in event.args
}

export interface BuildTransactionsResult {
  transactions: BridgeTransaction[]
  isPartial: boolean
}

// Request IDs are scoped to the source chain and bridge protocol. Preserve
// requests with unavailable explorer statuses as pending so polling can retry.
export async function buildTransactions(
  sdk: StatusClient,
  events: (BridgeRequestEvent | ExecutedTransferEvent)[],
): Promise<BuildTransactionsResult> {
  const requests = new Map<string, BridgeRequestEvent>()
  const transfers = new Map<string, ExecutedTransferEvent>()

  for (const event of events) {
    const sourceChainId = isRequestEvent(event) ? event.chainId : event.args.sourceChainId
    const key = `${event.args.bridge}:${sourceChainId}:${event.args.id.toString()}`
    if (isRequestEvent(event)) requests.set(key, event)
    else transfers.set(key, event)
  }

  let isPartial = false
  const transactions = await Promise.all(
    Array.from(new Set([...requests.keys(), ...transfers.keys()]), async (key): Promise<BridgeTransaction> => {
      const request = requests.get(key)
      const transfer = transfers.get(key)

      if (request && transfer) {
        return {
          hash: request.transactionHash,
          fromChainId: request.chainId,
          toChainId: request.args.targetChainId,
          amount: request.args.amount,
          protocol: request.args.bridge,
          status: { status: 'completed', srcTxHash: request.transactionHash, dstTxHash: transfer.transactionHash },
          timestamp: request.timestamp,
        }
      }

      if (request) {
        let status: BridgeTransaction['status']
        try {
          status = await sdk.getTransactionStatus(request.transactionHash, request.args.bridge)
        } catch {
          isPartial = true
          status = { status: 'pending', srcTxHash: request.transactionHash }
        }
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

      // An executed event can be visible even when the source request lies
      // outside the queried block range.
      const executed = transfer as ExecutedTransferEvent
      return {
        hash: executed.transactionHash,
        fromChainId: executed.args.sourceChainId,
        toChainId: executed.chainId,
        amount: executed.args.amount,
        protocol: executed.args.bridge,
        status: { status: 'completed', dstTxHash: executed.transactionHash },
        timestamp: executed.timestamp,
      }
    }),
  )
  return { transactions, isPartial }
}

export async function resolvePendingStatuses(
  sdk: StatusClient,
  transactions: BridgeTransaction[],
): Promise<BuildTransactionsResult> {
  let isPartial = false
  const updated = await Promise.all(transactions.map(async (transaction) => {
    if (transaction.status.status !== 'pending') return transaction
    try {
      const status = await sdk.getTransactionStatus(transaction.hash, transaction.protocol)
      return { ...transaction, status }
    } catch {
      isPartial = true
      return transaction
    }
  }))
  return { transactions: updated, isPartial }
}
