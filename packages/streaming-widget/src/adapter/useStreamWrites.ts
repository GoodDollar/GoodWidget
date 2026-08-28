import { useCallback, useMemo, useReducer } from 'react'
import type { StreamingSDK } from '@goodsdks/streaming-sdk'
import type { Address } from 'viem'
import type {
  SetStreamFormState,
  StreamListItem,
  WriteStatus,
} from '../widgetRuntimeContract'
import {
  DEFAULT_FORM_STATE,
  flowRateToAmountInput,
  humanReadableError,
  validateSetStreamForm,
} from './domain'

interface StreamWriteState {
  setStreamForm: SetStreamFormState
  setStreamStatus: WriteStatus
  setStreamError: string | null
  setStreamTxHash: string | null
  editingStreamId: string | null
  cancelStreamStatus: Record<string, WriteStatus>
  cancelStreamError: Record<string, string | null>
}

type StreamWriteAction =
  | { type: 'update'; form: SetStreamFormState }
  | { type: 'edit'; form: SetStreamFormState; streamId: string }
  | { type: 'start' }
  | { type: 'hash'; hash: string }
  | { type: 'success'; hash: string }
  | { type: 'error'; error: string }
  | { type: 'reset' }
  | { type: 'cancel:start'; key: string }
  | { type: 'cancel:success'; key: string }
  | { type: 'cancel:error'; key: string; error: string }

const initialStreamWriteState: StreamWriteState = {
  setStreamForm: DEFAULT_FORM_STATE,
  setStreamStatus: 'idle',
  setStreamError: null,
  setStreamTxHash: null,
  editingStreamId: null,
  cancelStreamStatus: {},
  cancelStreamError: {},
}

function streamWriteReducer(
  state: StreamWriteState,
  action: StreamWriteAction,
): StreamWriteState {
  switch (action.type) {
    case 'update':
      return { ...state, setStreamForm: action.form }
    case 'edit':
      return {
        ...state,
        setStreamForm: action.form,
        editingStreamId: action.streamId,
        setStreamStatus: 'idle',
        setStreamError: null,
        setStreamTxHash: null,
      }
    case 'start':
      return {
        ...state,
        setStreamStatus: 'pending',
        setStreamError: null,
        setStreamTxHash: null,
      }
    case 'hash':
      return { ...state, setStreamTxHash: action.hash }
    case 'success':
      return {
        ...state,
        setStreamStatus: 'success',
        setStreamTxHash: action.hash,
      }
    case 'error':
      return { ...state, setStreamStatus: 'error', setStreamError: action.error }
    case 'reset':
      return { ...initialStreamWriteState, cancelStreamStatus: state.cancelStreamStatus }
    case 'cancel:start':
      return {
        ...state,
        cancelStreamStatus: { ...state.cancelStreamStatus, [action.key]: 'pending' },
        cancelStreamError: { ...state.cancelStreamError, [action.key]: null },
      }
    case 'cancel:success':
      return {
        ...state,
        cancelStreamStatus: { ...state.cancelStreamStatus, [action.key]: 'success' },
        cancelStreamError: { ...state.cancelStreamError, [action.key]: null },
      }
    case 'cancel:error':
      return {
        ...state,
        cancelStreamStatus: { ...state.cancelStreamStatus, [action.key]: 'error' },
        cancelStreamError: { ...state.cancelStreamError, [action.key]: action.error },
      }
    default:
      return state
  }
}

interface UseStreamWritesArgs {
  streamingSDK: StreamingSDK | null
  refreshStreams: () => Promise<void>
}

export function useStreamWrites({ streamingSDK, refreshStreams }: UseStreamWritesArgs) {
  const [state, dispatch] = useReducer(streamWriteReducer, initialStreamWriteState)

  const updateSetStreamForm = useCallback((partial: Partial<SetStreamFormState>) => {
    dispatch({
      type: 'update',
      form: validateSetStreamForm({ ...state.setStreamForm, ...partial }),
    })
  }, [state.setStreamForm])

  const editStream = useCallback((stream: StreamListItem) => {
    dispatch({
      type: 'edit',
      streamId: stream.id,
      form: validateSetStreamForm({
        ...DEFAULT_FORM_STATE,
        receiver: stream.receiver,
        amount: flowRateToAmountInput(stream.flowRate, 'month'),
      }),
    })
  }, [])

  const submitSetStream = useCallback(async () => {
    if (!streamingSDK) return

    const validated = validateSetStreamForm(state.setStreamForm)
    dispatch({ type: 'update', form: validated })

    if (!validated.flowRate || validated.validationError) return

    dispatch({ type: 'start' })

    try {
      const hash = await streamingSDK.createOrUpdateStream({
        receiver: validated.receiver as Address,
        flowRate: validated.flowRate,
        onHash: (txHash) => dispatch({ type: 'hash', hash: txHash }),
      })
      dispatch({ type: 'success', hash })
      void refreshStreams()
    } catch (err) {
      dispatch({ type: 'error', error: humanReadableError(err) })
    }
  }, [streamingSDK, state.setStreamForm, refreshStreams])

  /**
   * Cancelling is the same write as updating — a flow rate of zero closes the
   * stream, which moves it out of the active list and into history.
   */
  const cancelStream = useCallback(
    async (receiver: Address) => {
      if (!streamingSDK) return

      const key = receiver.toLowerCase()
      dispatch({ type: 'cancel:start', key })

      try {
        await streamingSDK.createOrUpdateStream({ receiver, flowRate: 0n })
        dispatch({ type: 'cancel:success', key })
        await refreshStreams()
      } catch (err) {
        dispatch({ type: 'cancel:error', key, error: humanReadableError(err) })
      }
    },
    [streamingSDK, refreshStreams],
  )

  const resetSetStream = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  return useMemo(
    () => ({
      state,
      updateSetStreamForm,
      editStream,
      submitSetStream,
      cancelStream,
      resetSetStream,
    }),
    [
      state,
      updateSetStreamForm,
      editStream,
      submitSetStream,
      cancelStream,
      resetSetStream,
    ],
  )
}
