import { useCallback, useEffect, useState } from 'react'
import type { Address, PublicClient } from 'viem'
import type { GovernanceDashboardState } from '../widgetRuntimeContract'
import { ZERO_ADDRESS } from '../sdks/contracts'
import { readFlowSplitterConfig } from '../sdks/contractReads'
import { fetchFundingReceivedSoFar } from '../sdks/funding'

type FundingState = GovernanceDashboardState['fundingDistribution']

export function createFundingLoadingState(): FundingState {
  return {
    title: 'Funding received so far',
    centerLabel: 'Loading funding',
    totalAmount: {
      value: '0',
      token: 'G$',
      isStreaming: false,
      streamLabel: 'Loading Superfluid streams',
    },
    projects: [],
    isStreaming: false,
    stateLabel: 'Refreshing cumulative funding…',
    emptyStateLabel: 'Loading funding streams…',
  }
}

export function createFundingUnavailableState(): FundingState {
  return {
    title: 'Funding received so far',
    centerLabel: 'Funding unavailable',
    totalAmount: {
      value: '0',
      token: 'G$',
      isStreaming: false,
      streamLabel: 'Superfluid stream data unavailable',
    },
    projects: [],
    isStreaming: false,
    stateLabel: 'Funding data is temporarily unavailable.',
    emptyStateLabel: 'Membership and voting remain available while funding data refreshes.',
  }
}

export function useGovernanceFunding(params: {
  enabled: boolean
  publicClient: PublicClient
  housesAddress?: Address
  tokenAddress: Address
}) {
  const { enabled, publicClient, housesAddress, tokenAddress } = params
  const [funding, setFunding] = useState<FundingState>(() => createFundingLoadingState())
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || !housesAddress) return
    try {
      const flowConfig = await readFlowSplitterConfig({ publicClient, housesAddress })
      if (flowConfig.poolAddress.toLowerCase() === ZERO_ADDRESS) {
        setFunding({
          title: 'Funding received so far',
          centerLabel: 'No receiver configured',
          totalAmount: {
            value: '0',
            token: 'G$',
            isStreaming: false,
            streamLabel: 'No FlowSplitter pool receiver yet',
          },
          projects: [],
          isStreaming: false,
          emptyStateLabel: 'No funding receiver has been configured yet.',
        })
        setError(null)
        return
      }

      const total = await fetchFundingReceivedSoFar({
        receiver: flowConfig.poolAddress,
        token: tokenAddress,
      })
      const hasActiveStreams = total.activeStreamCount > 0
      const hasHistoricalStreams = total.streamCount > 0
      setFunding({
        title: 'Funding received so far',
        centerLabel: hasActiveStreams
          ? 'Active Superfluid total'
          : hasHistoricalStreams
            ? 'Cumulative received'
            : 'No streams yet',
        totalAmount: {
          value: total.formattedAmount,
          token: 'G$',
          isStreaming: hasActiveStreams,
          streamLabel: hasActiveStreams
            ? `${total.activeStreamCount} active stream${total.activeStreamCount === 1 ? '' : 's'}`
            : hasHistoricalStreams
              ? `${total.streamCount} stopped historical stream${total.streamCount === 1 ? '' : 's'}`
              : 'No inbound streams found',
        },
        projects: [],
        isStreaming: hasActiveStreams,
        stateLabel: hasHistoricalStreams && !hasActiveStreams
          ? 'Historical streams are stopped; their received totals remain included.'
          : undefined,
        emptyStateLabel: hasHistoricalStreams
          ? 'Distribution breakdown is unavailable until outgoing stream data exists.'
          : 'No funding streams have been received yet.',
      })
      setError(null)
    } catch (err: unknown) {
      setFunding(createFundingUnavailableState())
      setError(err instanceof Error ? err.message : 'Funding refresh failed')
    }
  }, [enabled, housesAddress, publicClient, tokenAddress])

  useEffect(() => {
    if (!enabled) {
      setFunding(createFundingLoadingState())
      setError(null)
      return
    }
    void refresh()
    const interval = globalThis.setInterval(() => void refresh(), 30_000)
    return () => globalThis.clearInterval(interval)
  }, [enabled, refresh])

  return { funding, error, refresh }
}
