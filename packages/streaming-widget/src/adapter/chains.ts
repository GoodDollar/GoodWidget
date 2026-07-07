import { createPublicClient, http, type Chain } from 'viem'
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
    rpcUrls: { default: { http: ['https://mainnet.base.org'] } },
  } as Chain,
}

export const BASE_CHAIN = VIEM_CHAINS[SupportedChains.BASE]

export function createBasePublicClient() {
  return createPublicClient({
    chain: BASE_CHAIN,
    transport: http(BASE_CHAIN.rpcUrls.default.http[0]),
  })
}
