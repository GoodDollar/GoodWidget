import { createPublicClient, fallback, formatUnits, http, type Chain } from 'viem'
import { SUPPORTED_CHAINS } from '@goodsdks/bridging-sdk'
import type { Hash } from 'viem'
import { BRIDGING_CHAINS, type BridgingRpcUrls } from '../widgetRuntimeContract'
import { formatTokenAmount } from '../amount'
import { DEFAULT_RPC_URLS, getBridgingRpcUrls } from './rpcUrls'

// RPC endpoints follow GoodSDKs' demo wiring except Ethereum, where its
// Cloudflare endpoint fails contract reads used by bridge configuration.
export const VIEM_CHAINS: Record<number, Chain> = {
  [BRIDGING_CHAINS.CELO]: {
    id: BRIDGING_CHAINS.CELO,
    name: 'Celo',
    nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
    rpcUrls: { default: { http: DEFAULT_RPC_URLS[BRIDGING_CHAINS.CELO] } },
  } as Chain,
  [BRIDGING_CHAINS.ETHEREUM]: {
    id: BRIDGING_CHAINS.ETHEREUM,
    name: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: DEFAULT_RPC_URLS[BRIDGING_CHAINS.ETHEREUM] } },
  } as Chain,
  [BRIDGING_CHAINS.FUSE]: {
    id: BRIDGING_CHAINS.FUSE,
    name: 'Fuse',
    nativeCurrency: { name: 'Fuse', symbol: 'FUSE', decimals: 18 },
    rpcUrls: { default: { http: DEFAULT_RPC_URLS[BRIDGING_CHAINS.FUSE] } },
  } as Chain,
  [BRIDGING_CHAINS.XDC]: {
    id: BRIDGING_CHAINS.XDC,
    name: 'XDC Network',
    nativeCurrency: { name: 'XDC', symbol: 'XDC', decimals: 18 },
    rpcUrls: { default: { http: DEFAULT_RPC_URLS[BRIDGING_CHAINS.XDC] } },
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
  if (!native) return formatTokenAmount(formatUnits(fee, 18))
  return `${formatTokenAmount(formatUnits(fee, native.decimals))} ${native.symbol}`
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

export function createBridgingPublicClient(chainId: number, overrides?: BridgingRpcUrls) {
  const chain = VIEM_CHAINS[chainId]
  if (!chain) return null

  const urls = getBridgingRpcUrls(chainId, overrides)
  const transport = urls.length > 1 ? fallback(urls.map((url) => http(url))) : http(urls[0])
  return createPublicClient({ chain, transport })
}
