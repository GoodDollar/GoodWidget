import { useMemo } from 'react'
import { createPublicClient, createWalletClient, custom, http } from 'viem'
import {
  GdaSDK,
  isSupportedChain,
  StreamingSDK,
  SubgraphClient,
  SupportedChains,
} from '@goodsdks/streaming-sdk'
import type { StreamingWidgetEnvironment } from '../widgetRuntimeContract'
import { createBasePublicClient, VIEM_CHAINS } from './chains'

interface UseStreamingClientsArgs {
  provider: unknown
  chainId: number | null
  environment: StreamingWidgetEnvironment
  apiKey?: string
}

export function useStreamingClients({
  provider,
  chainId,
  environment,
  apiKey,
}: UseStreamingClientsArgs) {
  const viemClients = useMemo(() => {
    if (!provider || !chainId || !isSupportedChain(chainId)) return null

    const chain = VIEM_CHAINS[chainId]
    if (!chain) return null

    const transport = custom(provider as Parameters<typeof custom>[0])
    const publicClient = createPublicClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    })
    const walletClient = createWalletClient({ chain, transport })

    return { publicClient, walletClient }
  }, [provider, chainId])

  const streamingSDK = useMemo(
    () =>
      viemClients
        ? new StreamingSDK(viemClients.publicClient, viemClients.walletClient, {
            environment,
            apiKey,
          })
        : null,
    [viemClients, environment, apiKey],
  )

  const gdaSDK = useMemo(
    () =>
      viemClients
        ? new GdaSDK(viemClients.publicClient, viemClients.walletClient, {
            environment,
          })
        : null,
    [viemClients, environment],
  )

  const basePublicClient = useMemo(() => createBasePublicClient(), [])

  const baseStreamingSDK = useMemo(
    () =>
      new StreamingSDK(basePublicClient, undefined, {
        chainId: SupportedChains.BASE,
        defaultToken: 'SUP',
        environment: 'production',
        apiKey,
      }),
    [basePublicClient, apiKey],
  )

  const baseSubgraphClient = useMemo(
    () => new SubgraphClient(SupportedChains.BASE, { apiKey }),
    [apiKey],
  )

  return {
    viemClients,
    streamingSDK,
    gdaSDK,
    baseStreamingSDK,
    baseSubgraphClient,
  }
}
