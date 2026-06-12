import { useCallback, useMemo, useReducer } from 'react'
import type { StreamingSDK } from '@goodsdks/streaming-sdk'
import type { Address } from 'viem'
import type { SetStreamFormState, WriteStatus } from '../widgetRuntimeContract'
import { DEFAULT_FORM_STATE, humanReadableError, validateSetStreamForm } from './domain'

interface SetStreamWriteState {
  setStreamForm: SetStreamFormState
  setStreamStatus: WriteStatus
  setStreamError: string | null
  setStreamTxHash: string | null
}

type SetStreamWriteAction =
  | { type: 'update'; form: SetStreamFormState }
  | { type: 'start' }
  | { type: 'hash'; hash: string }
  | { type: 'success'; hash: string }
  | { type: 'error'; error: string }
  | { type: 'reset' }

const initialSetStreamState: SetStreamWriteState = {
  setStreamForm: DEFAULT_FORM_STATE,
  setStreamStatus: 'idle',
  setStreamError: null,
  setStreamTxHash: null,
}

function setStreamWriteReducer(
  state: SetStreamWriteState,
  action: SetStreamWriteAction,
): SetStreamWriteState {
  switch (action.type) {
    case 'update':
      return { ...state, setStreamForm: action.form }
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
      return initialSetStreamState
    default:
      return state
  }
}

interface UseSetStreamFormArgs {
  streamingSDK: StreamingSDK | null
  refreshStreams: () => Promise<void>
}

export function useSetStreamForm({ streamingSDK, refreshStreams }: UseSetStreamFormArgs) {
  const [state, dispatch] = useReducer(setStreamWriteReducer, initialSetStreamState)

  const updateSetStreamForm = useCallback((partial: Partial<SetStreamFormState>) => {
    dispatch({
      type: 'update',
      form: validateSetStreamForm({ ...state.setStreamForm, ...partial }),
    })
  }, [state.setStreamForm])

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

  const resetSetStream = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  return useMemo(
    () => ({
      state,
      updateSetStreamForm,
      submitSetStream,
      resetSetStream,
    }),
    [state, updateSetStreamForm, submitSetStream, resetSetStream],
  )
}
