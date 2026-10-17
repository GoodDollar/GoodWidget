import { createPublicClient, custom, type Chain, type PublicClient } from 'viem'
import { createViemFallbackClient, type ViemFallbackStorage } from '@goodwidget/core'
import { SupportedChains } from '@goodsdks/streaming-sdk'

export const VIEM_CHAINS: Record<number, Chain> = {
  [SupportedChains.CELO]: {
    id: SupportedChains.CELO,
    name: 'Celo',
    nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
    rpcUrls: { default: { http: ['https://forno.celo.org'] } },
  } as Chain,
  [SupportedChains.BASE]: {
    id: SupportedChains.BASE,
    name: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://base.drpc.org'] } },
  } as Chain,
}

export const BASE_CHAIN = VIEM_CHAINS[SupportedChains.BASE]

function getRpcCacheStorage(): ViemFallbackStorage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  } catch {
    // Access itself throws in some privacy modes.
  }
  return {}
}

export function createStreamingFallbackClient() {
  return createViemFallbackClient(getRpcCacheStorage(), {
    chainIds: [SupportedChains.CELO, SupportedChains.BASE],
    rank: false,
  })
}

export function createStreamingPublicClient(
  chain: Chain,
  fallbackRpcs: string[] = [...(chain.rpcUrls.default.http ?? [])],
): PublicClient {
  const clientPromise = createStreamingFallbackClient().createPublicClient({
    chain,
    fallbackRpcs,
  })
  return createPublicClient({
    chain,
    transport: custom({
      async request(args) {
        const resolved = await clientPromise
        return resolved.transport.request(args)
      },
    }),
  })
}

export function createBasePublicClient(): PublicClient {
  return createStreamingPublicClient(BASE_CHAIN, [...BASE_CHAIN.rpcUrls.default.http])
}
