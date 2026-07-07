import type { AiCreditsWidgetAdapterState } from '../../widgetRuntimeContract'
import type { AiCreditsFlowStep } from './types'

export function mapStatusToActiveStep(
  state: AiCreditsWidgetAdapterState,
): AiCreditsFlowStep | null {
  if (!state.buyerKey || !state.buyerKeyConfirmed) return 'buyer_key'
  if (!state.operatorConsentSigned) return 'consent'
  if (
    state.status === 'purchase_setup' ||
    state.status === 'quote_ready' ||
    state.status === 'payment_pending' ||
    state.status === 'payment_confirmed' ||
    state.status === 'payment_failed'
  )
    return 'pay'
  return null
}

export function getAiCreditsActiveFlowStep(
  state: AiCreditsWidgetAdapterState,
): AiCreditsFlowStep | null {
  return mapStatusToActiveStep(state)
}

export function getActiveFlowStepActionLabel(
  state: AiCreditsWidgetAdapterState,
  step: AiCreditsFlowStep | null,
): string | null {
  if (!step) return null

  switch (step) {
    case 'buyer_key':
      if (!state.buyerKey) return 'Sign & Generate Key'
      if (!state.buyerKeyConfirmed) return "Continue Buyer Key"
      return 'View Buyer Key'
    case 'consent':
      return state.operatorConsentSigned ? 'View Operator Consent' : 'Sign Operator Consent'
    case 'pay':
      return 'Set Amounts & Pay'
    default:
      return null
  }
}

