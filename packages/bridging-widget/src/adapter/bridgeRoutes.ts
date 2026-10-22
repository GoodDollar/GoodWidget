import type { BridgeProtocol } from '@goodsdks/bridging-sdk'
import { BRIDGING_CHAINS, type BridgingChainId } from '../widgetRuntimeContract'

// bridging-sdk exposes no provider↔chain-pair matrix (tracked as a gap in
// GoodSDKs#67). This mirrors the only rule the SDK actually enforces, read
// out of BridgingSDK.estimateFee() in packages/bridging-sdk/src/viem-sdk.ts:
// Axelar rejects any route touching Fuse or XDC, so it only ever carries
// Celo<->Ethereum. LayerZero has no such restriction and carries every pair
// among the chains in SUPPORTED_CHAINS.
const AXELAR_CHAINS = new Set<number>([BRIDGING_CHAINS.CELO, BRIDGING_CHAINS.ETHEREUM])

export function getBridgeTargetChains(fromChainId: number): BridgingChainId[] {
  return (Object.values(BRIDGING_CHAINS) as BridgingChainId[]).filter(
    (chainId) => chainId !== fromChainId,
  )
}

export function getRouteProtocols(fromChainId: number, toChainId: number): BridgeProtocol[] {
  if (fromChainId === toChainId) return []

  const protocols: BridgeProtocol[] = []
  if (AXELAR_CHAINS.has(fromChainId) && AXELAR_CHAINS.has(toChainId)) {
    protocols.push('AXELAR')
  }
  protocols.push('LAYERZERO')

  return protocols
}
