import { useCallback, useEffect, useMemo } from 'react'
import { useWallet } from '@goodwidget/core'
import { isSupportedChain } from '@goodsdks/streaming-sdk'
import type { Address } from 'viem'
import type {
  StreamingWidgetAdapterActions,
  StreamingWidgetAdapterResult,
  StreamingWidgetAdapterState,
  StreamingWidgetEnvironment,
} from './widgetRuntimeContract'
import { usePoolWrites } from './adapter/usePoolWrites'
import { useSetStreamForm } from './adapter/useSetStreamForm'
import { useStreamingClients } from './adapter/useStreamingClients'
import { useStreamingData } from './adapter/useStreamingData'

export interface UseStreamingAdapterOptions {
  environment?: StreamingWidgetEnvironment
  apiKey?: string
}

export function useStreamingAdapter({
  environment = 'production',
  apiKey,
}: UseStreamingAdapterOptions = {}): StreamingWidgetAdapterResult {
  const { address, chainId, provider, isConnected, connect } = useWallet()
  const walletAddress = (address as Address | null) ?? null
  const activeChainId = chainId ?? null
  const isWrongChain = !!activeChainId && !isSupportedChain(activeChainId)
  const isReady = isConnected && !!walletAddress && !isWrongChain

  const {
    viemClients,
    streamingSDK,
    gdaSDK,
    baseStreamingSDK,
    baseSubgraphClient,
  } = useStreamingClients({
    provider,
    chainId: activeChainId,
    environment,
    apiKey,
  })

  const data = useStreamingData({
    address: walletAddress,
    streamingSDK,
    gdaSDK,
    baseStreamingSDK,
    baseSubgraphClient,
    viemClients,
  })

  const setStream = useSetStreamForm({
    streamingSDK,
    refreshStreams: data.refreshStreams,
  })

  const poolWrites = usePoolWrites({
    address: walletAddress,
    gdaSDK,
    viemClients,
    refreshPools: data.refreshPools,
  })

  useEffect(() => {
    if (isReady) return

    data.resetData()
    setStream.resetSetStream()
    poolWrites.resetPoolWrites()
  }, [
    isReady,
    data.resetData,
    setStream.resetSetStream,
    poolWrites.resetPoolWrites,
  ])

  useEffect(() => {
    if (!isReady) return

    void data.refreshAll()
  }, [isReady, walletAddress, activeChainId, data.refreshAll])

  const switchChain = useCallback(
    async (targetChainId: number) => {
      if (!provider) return

      const hexId = `0x${targetChainId.toString(16)}`
      await (
        provider as {
          request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
        }
      ).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexId }],
      })
    },
    [provider],
  )

  const state: StreamingWidgetAdapterState = useMemo(
    () => ({
      isConnected,
      address: walletAddress,
      chainId: activeChainId,
      isWrongChain,
      ...data.state,
      ...setStream.state,
      ...poolWrites.state,
    }),
    [
      isConnected,
      walletAddress,
      activeChainId,
      isWrongChain,
      data.state,
      setStream.state,
      poolWrites.state,
    ],
  )

  const actions: StreamingWidgetAdapterActions = useMemo(
    () => ({
      connect,
      switchChain,
      refreshStreams: data.refreshStreams,
      refreshStreamHistory: data.refreshStreamHistory,
      refreshPools: data.refreshPools,
      refreshBalance: data.refreshBalance,
      updateSetStreamForm: setStream.updateSetStreamForm,
      submitSetStream: setStream.submitSetStream,
      resetSetStream: setStream.resetSetStream,
      connectToPool: poolWrites.connectToPool,
      disconnectFromPool: poolWrites.disconnectFromPool,
      claimFromPool: poolWrites.claimFromPool,
    }),
    [
      connect,
      switchChain,
      data.refreshStreams,
      data.refreshStreamHistory,
      data.refreshPools,
      data.refreshBalance,
      setStream.updateSetStreamForm,
      setStream.submitSetStream,
      setStream.resetSetStream,
      poolWrites.connectToPool,
      poolWrites.disconnectFromPool,
      poolWrites.claimFromPool,
    ],
  )

  return { state, actions }
}
