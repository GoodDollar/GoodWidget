import { createPublicClient, http, type Chain } from 'viem'
import { SUPPORTED_CHAINS } from '@goodsdks/bridging-sdk'
import { BRIDGING_CHAINS } from '../widgetRuntimeContract'

// RPC endpoints matching GoodSDKs' own demo-bridging-app wiring
// (apps/demo-bridging-app/src/config.tsx), kept consistent with the SDK's
// reference integration rather than picked independently.
export const VIEM_CHAINS: Record<number, Chain> = {
  [BRIDGING_CHAINS.CELO]: {
    id: BRIDGING_CHAINS.CELO,
    name: 'Celo',
    nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
    rpcUrls: { default: { http: ['https://forno.celo.org'] } },
  } as Chain,
  [BRIDGING_CHAINS.ETHEREUM]: {
    id: BRIDGING_CHAINS.ETHEREUM,
    name: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://cloudflare-eth.com'] } },
  } as Chain,
  [BRIDGING_CHAINS.FUSE]: {
    id: BRIDGING_CHAINS.FUSE,
    name: 'Fuse',
    nativeCurrency: { name: 'Fuse', symbol: 'FUSE', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.fuse.io'] } },
  } as Chain,
  [BRIDGING_CHAINS.XDC]: {
    id: BRIDGING_CHAINS.XDC,
    name: 'XDC Network',
    nativeCurrency: { name: 'XDC', symbol: 'XDC', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.xdcrpc.com'] } },
  } as Chain,
}

export function isBridgingChain(chainId: number | null | undefined): boolean {
  return !!chainId && chainId in VIEM_CHAINS
}

export function getChainDecimals(chainId: number | null | undefined): number {
  if (!chainId) return 18
  return SUPPORTED_CHAINS[chainId]?.decimals ?? 18
}

export function createBridgingPublicClient(chainId: number) {
  const chain = VIEM_CHAINS[chainId]
  if (!chain) return null

  return createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0]) })
}

