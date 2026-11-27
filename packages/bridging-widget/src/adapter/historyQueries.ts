import type { Address, PublicClient } from 'viem'
import type { BridgingSDK } from '@goodsdks/bridging-sdk'

type EventQuery = Parameters<PublicClient['getContractEvents']>[0]
type EventLogs = Awaited<ReturnType<PublicClient['getContractEvents']>>

// SDK 1.0.6 sends its entire lookback in one RPC request and silently drops
// failed chains. Bound those reads here until the SDK exposes partial results.
export async function loadBridgeHistory(
  sdk: Pick<BridgingSDK, 'getCombinedHistory'>,
  address: Address,
  clients: Record<number, PublicClient>,
) {
  const incomplete = new Set<number>()
  const boundedClients = Object.fromEntries(Object.entries(clients).map(([key, client]) => {
    const chainId = Number(key)
    let head: bigint | undefined
    return [chainId, {
      ...client,
      getBlockNumber: async () => {
        try {
          head = await client.getBlockNumber()
          return head
        } catch (error) {
          incomplete.add(chainId)
          throw error
        }
      },
      getBlock: async (args: Parameters<PublicClient['getBlock']>[0]) => {
        try { return await client.getBlock(args) } catch (error) {
          incomplete.add(chainId)
          throw error
        }
      },
      getContractEvents: async (query: EventQuery) => {
        const logs: EventLogs = []
        const floor = typeof query.fromBlock === 'bigint' ? query.fromBlock : 0n
        let end = typeof query.toBlock === 'bigint' ? query.toBlock : head
        if (end === undefined) throw new Error('History block height unavailable')
        let pageSize = 5000n
        // A provider with a very small range limit must not trigger an
        // unbounded scan. Retain newer results and disclose any omitted range.
        for (let calls = 0; end >= floor && calls < 80; calls++) {
          const start = end - pageSize + 1n > floor ? end - pageSize + 1n : floor
          try {
            logs.push(...await client.getContractEvents({ ...query, fromBlock: start, toBlock: end }))
            end = start - 1n
          } catch (error) {
            const message = String(error).toLowerCase()
            if (pageSize > 100n && /range|too many|limit exceeded|response size/.test(message)) {
              pageSize = pageSize / 2n < 100n ? 100n : pageSize / 2n
              continue
            }
            incomplete.add(chainId)
            return logs
          }
        }
        if (end >= floor) incomplete.add(chainId)
        return logs
      },
    } as PublicClient]
  }))
  const events = await sdk.getCombinedHistory(address, boundedClients, { limit: 50 })
  return { events, isPartial: incomplete.size > 0, incompleteChainIds: [...incomplete].sort((a, b) => a - b) }
}
