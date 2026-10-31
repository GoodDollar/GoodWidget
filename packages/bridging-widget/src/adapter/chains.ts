import { createPublicClient, formatUnits, http, type Chain } from 'viem'
import { SUPPORTED_CHAINS } from '@goodsdks/bridging-sdk'
import type { Hash } from 'viem'
import { BRIDGING_CHAINS } from '../widgetRuntimeContract'

// RPC endpoints follow GoodSDKs' demo wiring except Ethereum, where its
// Cloudflare endpoint fails contract reads used by bridge configuration.
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
    rpcUrls: { default: { http: ['https://ethereum-rpc.publicnode.com'] } },
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

// The SDK's feeInNative is the unbuffered provider estimate. The transaction
// sends fee (which includes its buffer), so show that exact native-token value.
export function formatChargedProviderFee(fee: bigint, sourceChainId: number): string {
  const native = SUPPORTED_CHAINS[sourceChainId]?.nativeCurrency
  if (!native) return formatUnits(fee, 18)
  return `${formatUnits(fee, native.decimals)} ${native.symbol}`
}

const TRANSACTION_EXPLORERS: Record<number, string> = {
  [BRIDGING_CHAINS.CELO]: 'https://celoscan.io/tx',
  [BRIDGING_CHAINS.ETHEREUM]: 'https://etherscan.io/tx',
  [BRIDGING_CHAINS.FUSE]: 'https://explorer.fuse.io/tx',
  [BRIDGING_CHAINS.XDC]: 'https://xdcscan.com/tx',
}

export function getChainTransactionExplorerLink(chainId: number | null, hash: Hash | null): string | null {
  const explorer = chainId === null ? undefined : TRANSACTION_EXPLORERS[chainId]
  return explorer && hash ? `${explorer}/${hash}` : null
}

export function createBridgingPublicClient(chainId: number) {
  const chain = VIEM_CHAINS[chainId]
  if (!chain) return null

  return createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0]) })
}
