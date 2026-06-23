import { useCallback, useMemo, useReducer } from 'react'
import type { GdaSDK, StreamingSDK, SubgraphClient } from '@goodsdks/streaming-sdk'
import type { Address, PublicClient, WalletClient } from 'viem'
import { formatUnits } from 'viem'
import type {
  PoolMembershipItem,
  StreamingWidgetAdapterState,
  StreamListItem,
} from '../widgetRuntimeContract'
import {
  GDA_POOL_CLAIM_ABI,
  humanReadableError,
  toPoolMembershipItem,
  toStreamListItem,
} from './domain'

type StreamingDataState = Pick<
  StreamingWidgetAdapterState,
  | 'streams'
  | 'streamsLoading'
  | 'streamsError'
  | 'streamHistory'
  | 'streamHistoryLoading'
  | 'streamHistoryError'
  | 'pools'
  | 'poolsLoading'
  | 'poolsError'
  | 'superTokenBalance'
  | 'balanceLoading'
  | 'balanceError'
  | 'supTokenBalance'
  | 'supBalanceLoading'
  | 'supBalanceError'
  | 'supReserveBalance'
  | 'supReserveLockers'
  | 'supReserveLoading'
  | 'supReserveError'
>

type StreamingDataAction =
  | { type: 'reset' }
  | { type: 'streams:start' }
  | { type: 'streams:success'; streams: StreamListItem[] }
  | { type: 'streams:error'; error: string }
  | { type: 'pools:start' }
  | { type: 'pools:success'; pools: PoolMembershipItem[] }
  | { type: 'pools:error'; error: string }
  | { type: 'balance:start' }
  | { type: 'balance:success'; balance: string }
  | { type: 'balance:error'; error: string }
  | { type: 'supBalance:start' }
  | { type: 'supBalance:success'; balance: string }
  | { type: 'supBalance:error'; error: string }
  | { type: 'supReserve:start' }
  | {
      type: 'supReserve:success'
      balance: string
      lockers: StreamingWidgetAdapterState['supReserveLockers']
    }
  | { type: 'supReserve:error'; error: string }

const initialDataState: StreamingDataState = {
  streams: [],
  streamsLoading: false,
  streamsError: null,
  streamHistory: [],
  streamHistoryLoading: false,
  streamHistoryError: null,
  pools: [],
  poolsLoading: false,
  poolsError: null,
  superTokenBalance: null,
  balanceLoading: false,
  balanceError: null,
  supTokenBalance: null,
  supBalanceLoading: false,
  supBalanceError: null,
  supReserveBalance: null,
  supReserveLockers: [],
  supReserveLoading: false,
  supReserveError: null,
}

function streamingDataReducer(
  state: StreamingDataState,
  action: StreamingDataAction,
): StreamingDataState {
  switch (action.type) {
    case 'reset':
      return initialDataState
    case 'streams:start':
      return {
        ...state,
        streamsLoading: true,
        streamsError: null,
        streamHistoryLoading: true,
        streamHistoryError: null,
      }
    case 'streams:success':
      return {
        ...state,
        streams: action.streams,
        streamsLoading: false,
        streamsError: null,
        streamHistory: action.streams,
        streamHistoryLoading: false,
        streamHistoryError: null,
      }
    case 'streams:error':
      return {
        ...state,
        streamsLoading: false,
        streamsError: action.error,
        streamHistoryLoading: false,
        streamHistoryError: action.error,
      }
    case 'pools:start':
      return { ...state, poolsLoading: true, poolsError: null }
    case 'pools:success':
      return { ...state, pools: action.pools, poolsLoading: false, poolsError: null }
    case 'pools:error':
      return { ...state, poolsLoading: false, poolsError: action.error }
    case 'balance:start':
      return { ...state, balanceLoading: true, balanceError: null }
    case 'balance:success':
      return {
        ...state,
        superTokenBalance: action.balance,
        balanceLoading: false,
        balanceError: null,
      }
    case 'balance:error':
      return { ...state, balanceLoading: false, balanceError: action.error }
    case 'supBalance:start':
      return { ...state, supBalanceLoading: true, supBalanceError: null }
    case 'supBalance:success':
      return {
        ...state,
        supTokenBalance: action.balance,
        supBalanceLoading: false,
        supBalanceError: null,
      }
    case 'supBalance:error':
      return { ...state, supBalanceLoading: false, supBalanceError: action.error }
    case 'supReserve:start':
      return { ...state, supReserveLoading: true, supReserveError: null }
    case 'supReserve:success':
      return {
        ...state,
        supReserveBalance: action.balance,
        supReserveLockers: action.lockers,
        supReserveLoading: false,
        supReserveError: null,
      }
    case 'supReserve:error':
      return {
        ...state,
        supReserveBalance: null,
        supReserveLockers: [],
        supReserveLoading: false,
        supReserveError: action.error,
      }
    default:
      return state
  }
}

async function runResourceAction<T>({
  onStart,
  load,
  onSuccess,
  onError,
}: {
  onStart: () => void
  load: () => Promise<T>
  onSuccess: (value: T) => void
  onError: (message: string) => void
}) {
  onStart()
  try {
    onSuccess(await load())
  } catch (err) {
    onError(humanReadableError(err))
  }
}

interface UseStreamingDataArgs {
  address: Address | null
  streamingSDK: StreamingSDK | null
  gdaSDK: GdaSDK | null
  baseStreamingSDK: StreamingSDK
  baseSubgraphClient: SubgraphClient
  viemClients: {
    publicClient: PublicClient
    walletClient: WalletClient
  } | null
}

export function useStreamingData({
  address,
  streamingSDK,
  gdaSDK,
  baseStreamingSDK,
  baseSubgraphClient,
  viemClients,
}: UseStreamingDataArgs) {
  const [state, dispatch] = useReducer(streamingDataReducer, initialDataState)

  const resetData = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const refreshStreams = useCallback(async () => {
    if (!streamingSDK || !address) return

    await runResourceAction({
      onStart: () => dispatch({ type: 'streams:start' }),
      load: async () => {
        const result = await streamingSDK.getActiveStreams({
          account: address,
          direction: 'all',
        })
        return result.map((stream) => toStreamListItem(stream, address))
      },
      onSuccess: (streams) => dispatch({ type: 'streams:success', streams }),
      onError: (error) => dispatch({ type: 'streams:error', error }),
    })
  }, [streamingSDK, address])

  const refreshPools = useCallback(async () => {
    if (!gdaSDK || !address) return

    await runResourceAction({
      onStart: () => dispatch({ type: 'pools:start' }),
      load: async () => {
        const result = await gdaSDK.getDistributionPools(address)
        const normalizedPools = result.map(toPoolMembershipItem)

        if (!viemClients) return normalizedPools

        return Promise.all(
          normalizedPools.map(async (pool) => {
            try {
              const [claimableAmount] = await viemClients.publicClient.readContract({
                address: pool.poolId,
                abi: GDA_POOL_CLAIM_ABI,
                functionName: 'getClaimableNow',
                args: [address],
              })

              return {
                ...pool,
                claimableAmount: claimableAmount > 0n ? claimableAmount : 0n,
                claimableAmountError: false,
              }
            } catch {
              return { ...pool, claimableAmountError: true }
            }
          }),
        )
      },
      onSuccess: (pools) => dispatch({ type: 'pools:success', pools }),
      onError: (error) => dispatch({ type: 'pools:error', error }),
    })
  }, [gdaSDK, address, viemClients])

  const refreshActiveBalance = useCallback(async () => {
    if (!streamingSDK || !address) return

    await runResourceAction({
      onStart: () => dispatch({ type: 'balance:start' }),
      load: async () => formatUnits(await streamingSDK.getSuperTokenBalance(address), 18),
      onSuccess: (balance) => dispatch({ type: 'balance:success', balance }),
      onError: (error) => dispatch({ type: 'balance:error', error }),
    })
  }, [streamingSDK, address])

  const refreshSupBalance = useCallback(async () => {
    if (!address) return

    await runResourceAction({
      onStart: () => dispatch({ type: 'supBalance:start' }),
      load: async () =>
        formatUnits(await baseStreamingSDK.getSuperTokenBalance(address, 'SUP'), 18),
      onSuccess: (balance) => dispatch({ type: 'supBalance:success', balance }),
      onError: (error) => dispatch({ type: 'supBalance:error', error }),
    })
  }, [baseStreamingSDK, address])

  const refreshSupReserve = useCallback(async () => {
    if (!address) return

    await runResourceAction({
      onStart: () => dispatch({ type: 'supReserve:start' }),
      load: async () => {
        const lockers = await baseSubgraphClient.querySUPReserves(address)
        const lockersWithBalances = await Promise.all(
          lockers.map(async (locker) => {
            const unstakedBalance = await baseStreamingSDK.getSuperTokenBalance(
              locker.id as Address,
              'SUP',
            )
            return {
              address: locker.id as Address,
              stakedBalance: locker.stakedBalance,
              unstakedBalance,
              totalBalance: locker.stakedBalance + unstakedBalance,
            }
          }),
        )
        const total = lockersWithBalances.reduce((sum, locker) => sum + locker.totalBalance, 0n)

        return {
          balance: formatUnits(total, 18),
          lockers: lockersWithBalances,
        }
      },
      onSuccess: ({ balance, lockers }) =>
        dispatch({ type: 'supReserve:success', balance, lockers }),
      onError: (error) => dispatch({ type: 'supReserve:error', error }),
    })
  }, [baseSubgraphClient, baseStreamingSDK, address])

  const refreshBalance = useCallback(async () => {
    await Promise.all([refreshActiveBalance(), refreshSupBalance(), refreshSupReserve()])
  }, [refreshActiveBalance, refreshSupBalance, refreshSupReserve])

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshStreams(), refreshPools(), refreshBalance()])
  }, [refreshStreams, refreshPools, refreshBalance])

  return useMemo(
    () => ({
      state,
      resetData,
      refreshStreams,
      refreshStreamHistory: refreshStreams,
      refreshPools,
      refreshBalance,
      refreshAll,
    }),
    [state, resetData, refreshStreams, refreshPools, refreshBalance, refreshAll],
  )
}
