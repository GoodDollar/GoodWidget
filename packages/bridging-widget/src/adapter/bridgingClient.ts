import { useMemo } from 'react'
import { createWalletClient, custom, type PublicClient, type WalletClient } from 'viem'
import { BridgingSDK } from '@goodsdks/bridging-sdk'
import type { EIP1193Provider } from '@goodwidget/core'
import { createBridgingPublicClient, VIEM_CHAINS } from './chains'

// One read-only public client per supported chain, built once, so the SDK can
// read source + destination balances/limits/fees without requiring the
// connected wallet to switch chains just to answer a read.
function buildPublicClients(): Record<number, PublicClient> {
  const clients: Record<number, PublicClient> = {}
  for (const chainId of Object.keys(VIEM_CHAINS).map(Number)) {
    const client = createBridgingPublicClient(chainId)
    if (client) clients[chainId] = client
  }
  return clients
}

interface UseBridgingSdkArgs {
  provider: EIP1193Provider | null
  chainId: number | null
  publicClients: Record<number, PublicClient>
}

// Exposed separately from useBridgingSdk so callers that need the raw
// per-chain clients (e.g. useBridgeHistory's getCombinedHistory, which takes
// a clients map directly rather than reading the SDK's private copy of it)
// share the exact same memoized map instead of building a second one.
export function useBridgingPublicClients(): Record<number, PublicClient> {
  return useMemo(buildPublicClients, [])
}

// Builds the BridgingSDK instance used by the Bridge tab. Returns null until
// the wallet is on a supported chain, mirroring streaming-widget's
// useStreamingClients pattern (memoized clients, memoized SDK on top).
export function useBridgingSdk({ provider, chainId, publicClients }: UseBridgingSdkArgs): BridgingSDK | null {
  const walletClient = useMemo<WalletClient | undefined>(() => {
    if (!provider || chainId === null) return undefined
    const chain = VIEM_CHAINS[chainId]
    if (!chain) return undefined
    return createWalletClient({ chain, transport: custom(provider as Parameters<typeof custom>[0]) })
  }, [provider, chainId])

  return useMemo(() => {
    if (chainId === null || !publicClients[chainId]) return null
    return new BridgingSDK(publicClients[chainId], walletClient, chainId, publicClients)
  }, [publicClients, walletClient, chainId])
}
