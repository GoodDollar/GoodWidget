import { useCallback, useMemo, useReducer } from 'react'
import type { GdaSDK } from '@goodsdks/streaming-sdk'
import type { Address, PublicClient, WalletClient } from 'viem'
import type { StreamingWidgetAdapterState, WriteStatus } from '../widgetRuntimeContract'
import { GDA_POOL_CLAIM_ABI, humanReadableError } from './domain'

type PoolWriteState = Pick<
  StreamingWidgetAdapterState,
  'poolConnectStatus' | 'poolConnectError' | 'poolClaimStatus' | 'poolClaimError'
>

type PoolWriteAction =
  | { type: 'reset' }
  | { type: 'connect:start'; poolAddress: Address }
  | { type: 'connect:success'; poolAddress: Address }
  | { type: 'connect:error'; poolAddress: Address; error: string }
  | { type: 'claim:start'; poolAddress: Address }
  | { type: 'claim:success'; poolAddress: Address }
  | { type: 'claim:error'; poolAddress: Address; error: string }

const initialPoolWriteState: PoolWriteState = {
  poolConnectStatus: {},
  poolConnectError: {},
  poolClaimStatus: {},
  poolClaimError: {},
}

function setStatus(
  state: Record<string, WriteStatus>,
  poolAddress: Address,
  status: WriteStatus,
) {
  return { ...state, [poolAddress]: status }
}

function setError(
  state: Record<string, string | null>,
  poolAddress: Address,
  error: string | null,
) {
  return { ...state, [poolAddress]: error }
}

function poolWriteReducer(
  state: PoolWriteState,
  action: PoolWriteAction,
): PoolWriteState {
  switch (action.type) {
    case 'reset':
      return initialPoolWriteState
    case 'connect:start':
      return {
        ...state,
        poolConnectStatus: setStatus(state.poolConnectStatus, action.poolAddress, 'pending'),
        poolConnectError: setError(state.poolConnectError, action.poolAddress, null),
      }
    case 'connect:success':
      return {
        ...state,
        poolConnectStatus: setStatus(state.poolConnectStatus, action.poolAddress, 'success'),
      }
    case 'connect:error':
      return {
        ...state,
        poolConnectStatus: setStatus(state.poolConnectStatus, action.poolAddress, 'error'),
        poolConnectError: setError(
          state.poolConnectError,
          action.poolAddress,
          action.error,
        ),
      }
    case 'claim:start':
      return {
        ...state,
        poolClaimStatus: setStatus(state.poolClaimStatus, action.poolAddress, 'pending'),
        poolClaimError: setError(state.poolClaimError, action.poolAddress, null),
      }
    case 'claim:success':
      return {
        ...state,
        poolClaimStatus: setStatus(state.poolClaimStatus, action.poolAddress, 'success'),
      }
    case 'claim:error':
      return {
        ...state,
        poolClaimStatus: setStatus(state.poolClaimStatus, action.poolAddress, 'error'),
        poolClaimError: setError(state.poolClaimError, action.poolAddress, action.error),
      }
    default:
      return state
  }
}

interface UsePoolWritesArgs {
  address: Address | null
  gdaSDK: GdaSDK | null
  viemClients: {
    publicClient: PublicClient
    walletClient: WalletClient
  } | null
  refreshPools: () => Promise<void>
}

export function usePoolWrites({
  address,
  gdaSDK,
  viemClients,
  refreshPools,
}: UsePoolWritesArgs) {
  const [state, dispatch] = useReducer(poolWriteReducer, initialPoolWriteState)

  const resetPoolWrites = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const connectToPool = useCallback(
    async (poolAddress: Address) => {
      if (!gdaSDK) return

      dispatch({ type: 'connect:start', poolAddress })
      try {
        await gdaSDK.connectToPool({ poolAddress })
        dispatch({ type: 'connect:success', poolAddress })
        void refreshPools()
      } catch (err) {
        dispatch({
          type: 'connect:error',
          poolAddress,
          error: humanReadableError(err),
        })
      }
    },
    [gdaSDK, refreshPools],
  )

  const disconnectFromPool = useCallback(
    async (poolAddress: Address) => {
      if (!gdaSDK) return

      dispatch({ type: 'connect:start', poolAddress })
      try {
        await gdaSDK.disconnectFromPool({ poolAddress })
        dispatch({ type: 'connect:success', poolAddress })
        void refreshPools()
      } catch (err) {
        dispatch({
          type: 'connect:error',
          poolAddress,
          error: humanReadableError(err),
        })
      }
    },
    [gdaSDK, refreshPools],
  )

  const claimFromPool = useCallback(
    async (poolAddress: Address) => {
      if (!viemClients || !address) return

      dispatch({ type: 'claim:start', poolAddress })
      try {
        const hash = await viemClients.walletClient.writeContract({
          account: address,
          address: poolAddress,
          abi: GDA_POOL_CLAIM_ABI,
          functionName: 'claimAll',
        })
        await viemClients.publicClient.waitForTransactionReceipt({ hash })
        dispatch({ type: 'claim:success', poolAddress })
        void refreshPools()
      } catch (err) {
        dispatch({
          type: 'claim:error',
          poolAddress,
          error: humanReadableError(err),
        })
      }
    },
    [viemClients, address, refreshPools],
  )

  return useMemo(
    () => ({
      state,
      resetPoolWrites,
      connectToPool,
      disconnectFromPool,
      claimFromPool,
    }),
    [
      state,
      resetPoolWrites,
      connectToPool,
      disconnectFromPool,
      claimFromPool,
    ],
  )
}
