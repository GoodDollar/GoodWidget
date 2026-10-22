import { useCallback, useRef, useState } from 'react'
import type { TransactionReceipt } from 'viem'
import type { BridgeFeeQuote, BridgeStatus, BridgingSDK } from '@goodsdks/bridging-sdk'
import { mapBridgeError } from './errors'

export type BridgeSubmissionStep = 'idle' | 'approving' | 'bridging' | 'completed' | 'failed'

export interface BridgeSubmissionState {
  step: BridgeSubmissionStep
  /** Which in-flight step doBridge was on when it rejected, so the Confirm
   *  modal's Stepper can mark that row failed instead of defaulting to the first one. */
  failedAtStep: 'approving' | 'bridging' | null
  error: string | null
  receipt: TransactionReceipt | null
}

const IDLE_STATE: BridgeSubmissionState = { step: 'idle', failedAtStep: null, error: null, receipt: null }

interface UseBridgeSubmissionArgs {
  sdk: BridgingSDK | null
}

export interface BridgeSubmissionResult extends BridgeSubmissionState {
  submit: (quote: BridgeFeeQuote) => Promise<void>
  reset: () => void
}

// Drives the Confirm modal's Stepper from BridgingSDK.doBridge's onStatus
// callback. BridgeStatus.step ('approving' | 'bridging' | 'completed' |
// 'failed') is used directly as the submission step, so there is no
// parallel state machine to keep in sync with the SDK's own.
export function useBridgeSubmission({ sdk }: UseBridgeSubmissionArgs): BridgeSubmissionResult {
  const [state, setState] = useState<BridgeSubmissionState>(IDLE_STATE)
  // doBridge rejects without saying which step it was on; this ref keeps the
  // last step reported by onStatus so the catch block can attribute the failure.
  const lastInFlightStepRef = useRef<'approving' | 'bridging' | null>(null)

  const submit = useCallback(
    async (quote: BridgeFeeQuote) => {
      if (!sdk) return

      lastInFlightStepRef.current = null
      setState({ step: 'approving', failedAtStep: null, error: null, receipt: null })

      try {
        const receipt = await sdk.doBridge(quote, (status: BridgeStatus) => {
          if (status.step === 'approving' || status.step === 'bridging') {
            lastInFlightStepRef.current = status.step
          }
          if (status.step !== 'failed') {
            setState((current) => ({ ...current, step: status.step, error: null }))
          }
        })
        setState({ step: 'completed', failedAtStep: null, error: null, receipt })
      } catch (err: unknown) {
        setState({
          step: 'failed',
          failedAtStep: lastInFlightStepRef.current,
          error: mapBridgeError(err, 'Bridge transaction failed.'),
          receipt: null,
        })
      }
    },
    [sdk],
  )

  const reset = useCallback(() => setState(IDLE_STATE), [])

  return { ...state, submit, reset }
}
