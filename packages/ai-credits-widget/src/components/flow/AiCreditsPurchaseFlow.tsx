import React, { useCallback, useEffect, useRef } from 'react'
import type {
  AiCreditsQuote,
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterState,
} from '../../widgetRuntimeContract'
import { AmountPicker } from '../buy/AmountPicker'

interface AiCreditsPurchaseFlowProps {
  state: AiCreditsWidgetAdapterState
  actions: AiCreditsWidgetAdapterActions
  isPending: boolean
  onPay: (quote: AiCreditsQuote) => void
}

/**
 * Reason the purchase cannot go through yet, or null when it can.
 *
 * The Setup tab owns the signer key and the wallet authorization, so Buy no
 * longer repeats them as steps — it just states what is still missing and keeps
 * the amounts explorable in the meantime.
 */
function getPayBlockedReason(state: AiCreditsWidgetAdapterState): string | null {
  if (!state.signerPubKey) {
    return 'Generate or import your signer key in the Set Up tab before buying.'
  }
  if (!state.operatorConsented) {
    return state.operatorConsentPending
      ? 'Waiting for your wallet authorization to confirm…'
      : 'Authorize your wallet in the Set Up tab before buying.'
  }
  return null
}

/**
 * The Buy tab: the purchase UI on its own. Setup progress lives in the Setup
 * tab, so there is no stepper or drawer here — the amount picker is the tab.
 */
export function AiCreditsPurchaseFlow({
  state,
  actions,
  isPending,
  onPay,
}: AiCreditsPurchaseFlowProps) {
  // Consent may have been granted on another device or in an earlier session,
  // so reconcile against the chain rather than trusting local state alone. Keyed
  // on payer+signer because `actions` is rebuilt on every state change.
  const syncedConsentForRef = useRef<string | null>(null)
  useEffect(() => {
    if (state.operatorConsented) return
    if (!state.address || !state.signerPubKey) return
    const key = `${state.address}:${state.signerPubKey}`.toLowerCase()
    if (syncedConsentForRef.current === key) return
    syncedConsentForRef.current = key
    void actions.syncOperatorConsentFromChain()
  }, [state.operatorConsented, state.address, state.signerPubKey, actions])

  const handleVerifyGoodId = useCallback(async () => {
    await actions.verifyGoodId()
  }, [actions])

  return (
    <AmountPicker
      status={state.status}
      gBalance={state.gBalance}
      minDepositUsd={state.minDepositUsd}
      minStreamUsd={state.minStreamUsd}
      monthlyStreamG={state.monthlyStreamG}
      gdUsdPerToken={state.gdUsdPerToken}
      isGoodIdVerified={state.isGoodIdVerified}
      depositBonusPercent={state.depositBonusPercent}
      streamBonusPercent={state.streamBonusPercent}
      isPayPending={isPending}
      payBlockedReason={getPayBlockedReason(state)}
      buildQuote={actions.buildQuote}
      onPay={onPay}
      onVerifyGoodId={handleVerifyGoodId}
    />
  )
}
