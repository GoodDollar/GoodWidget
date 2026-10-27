import { useCallback, useEffect, useRef, useState } from 'react'
import type { TransactionReceipt } from 'viem'
import type {
  BridgeFeeQuote,
  BridgeProtocol,
  BridgeStatus,
  BridgingSDK,
  TransactionStatus,
} from '@goodsdks/bridging-sdk'
import { mapBridgeError } from './errors'

export type BridgeSubmissionStep = 'idle' | 'approving' | 'bridging' | 'completed' | 'failed'

export interface BridgeSubmissionState {
  step: BridgeSubmissionStep
  /** Which in-flight step doBridge was on when it rejected, so the Confirm
   *  modal's Stepper can mark that row failed instead of defaulting to the first one. */
  failedAtStep: 'approving' | 'bridging' | null
  error: string | null
  receipt: TransactionReceipt | null
  sourceChainId: number | null
  targetChainId: number | null
  protocol: BridgeProtocol | null
  amount: bigint | null
  deliveryStatus: TransactionStatus | null
  deliveryStatusError: string | null
}

const IDLE_STATE: BridgeSubmissionState = {
  step: 'idle',
  failedAtStep: null,
  error: null,
  receipt: null,
  sourceChainId: null,
  targetChainId: null,
  protocol: null,
  amount: null,
  deliveryStatus: null,
  deliveryStatusError: null,
}

interface UseBridgeSubmissionArgs {
  sdk: BridgingSDK | null
}

export interface BridgeSubmissionResult extends BridgeSubmissionState {
  submit: (loadQuote: () => Promise<BridgeFeeQuote>, isCurrent: () => boolean, sourceChainId: number) => Promise<void>
  cancelPreparation: () => void
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
  const requestIdRef = useRef(0)
  // A quote/network switch is cancellable. Once doBridge starts, preserve its
  // status callbacks even if the wallet account or selected source changes.
  const preparingRequestRef = useRef<number | null>(null)

  const submit = useCallback(
    async (loadQuote: () => Promise<BridgeFeeQuote>, isCurrent: () => boolean, sourceChainId: number) => {
      if (!sdk) return

      const requestId = ++requestIdRef.current
      preparingRequestRef.current = requestId
      lastInFlightStepRef.current = null
      setState({ ...IDLE_STATE, step: 'approving', sourceChainId })
      let doBridgeStarted = false

      try {
        const quote = await loadQuote()
        if (requestIdRef.current !== requestId) return
        if (preparingRequestRef.current === requestId && !isCurrent()) {
          preparingRequestRef.current = null
          setState(IDLE_STATE)
          return
        }
        setState((current) => ({
          ...current,
          targetChainId: quote.targetChainId,
          protocol: quote.protocol,
          amount: quote.amount,
        }))
        preparingRequestRef.current = null
        doBridgeStarted = true
        const receipt = await sdk.doBridge(quote, (status: BridgeStatus) => {
          if (requestIdRef.current !== requestId) return
          if (status.step === 'approving' || status.step === 'bridging') {
            lastInFlightStepRef.current = status.step
          }
          if (status.step !== 'failed') {
            setState((current) => ({ ...current, step: status.step, error: null }))
          }
        })
        if (requestIdRef.current !== requestId) return
        setState((current) => ({
          ...current,
          step: 'completed',
          failedAtStep: null,
          error: null,
          receipt,
          deliveryStatus: { status: 'pending', srcTxHash: receipt.transactionHash },
          deliveryStatusError: null,
        }))
      } catch (err: unknown) {
        if (requestIdRef.current !== requestId) return
        if (preparingRequestRef.current === requestId && !isCurrent()) {
          preparingRequestRef.current = null
          setState(IDLE_STATE)
          return
        }
        preparingRequestRef.current = null
        setState({
          ...IDLE_STATE,
          step: 'failed',
          sourceChainId,
          failedAtStep: lastInFlightStepRef.current,
          error: mapBridgeError(
            err,
            doBridgeStarted ? 'Bridge transaction failed.' : 'Unable to prepare bridge. Please try again.',
            doBridgeStarted ? 'transaction' : 'other',
          ),
          receipt: null,
        })
      }
    },
    [sdk],
  )

  useEffect(() => {
    const hash = state.receipt?.transactionHash
    const protocol = state.protocol
    if (!sdk || state.step !== 'completed' || !hash || !protocol) return

    let active = true
    let timeout: ReturnType<typeof setTimeout> | undefined
    const poll = async () => {
      try {
        const deliveryStatus = await sdk.getTransactionStatus(hash, protocol)
        if (!active) return
        setState((current) => current.receipt?.transactionHash === hash
          ? { ...current, deliveryStatus, deliveryStatusError: null }
          : current)
        if (deliveryStatus.status === 'pending') timeout = setTimeout(poll, 15_000)
      } catch {
        if (!active) return
        setState((current) => current.receipt?.transactionHash === hash
          ? { ...current, deliveryStatusError: 'Delivery status is temporarily unavailable. Retrying…' }
          : current)
        timeout = setTimeout(poll, 15_000)
      }
    }

    void poll()
    return () => {
      active = false
      if (timeout) clearTimeout(timeout)
    }
  }, [sdk, state.step, state.receipt, state.protocol])

  const cancelPreparation = useCallback(() => {
    if (preparingRequestRef.current === null) return
    preparingRequestRef.current = null
    requestIdRef.current += 1
    lastInFlightStepRef.current = null
    setState(IDLE_STATE)
  }, [])

  const reset = useCallback(() => {
    requestIdRef.current += 1
    preparingRequestRef.current = null
    lastInFlightStepRef.current = null
    setState(IDLE_STATE)
  }, [])

  return { ...state, submit, cancelPreparation, reset }
}
