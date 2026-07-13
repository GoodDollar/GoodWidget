import type { AiCreditsWidgetAdapterState } from '../../widgetRuntimeContract'
import type { AiCreditsFlowStep } from './types'

export function mapStatusToActiveStep(
  state: AiCreditsWidgetAdapterState,
  buyerPubKeySaved: boolean,
): AiCreditsFlowStep | null {
  if (state.operatorConsented) return 'pay'
  if (!state.buyerPubKey || !state.buyerPrvKey) return 'buyer_key'
  if (!buyerPubKeySaved) return 'buyer_key'
  if (!state.operatorConsented) return 'consent'
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
  buyerPubKeySaved: boolean,
): AiCreditsFlowStep | null {
  return mapStatusToActiveStep(state, buyerPubKeySaved)
}

export function getActiveFlowStepActionLabel(
  state: AiCreditsWidgetAdapterState,
  step: AiCreditsFlowStep | null,
  buyerPubKeySaved: boolean,
): string | null {
  if (!step) return null

  switch (step) {
    case 'buyer_key':
      if (!state.buyerPubKey) return 'Sign & Generate Key'
      if (!buyerPubKeySaved) return "Continue Buyer Key"
      return 'View Buyer Key'
    case 'consent':
      return state.operatorConsented ? 'View Operator Consent' : 'Sign Operator Consent'
    case 'pay':
      return 'Set Amounts & Pay'
    default:
      return null
  }
}
