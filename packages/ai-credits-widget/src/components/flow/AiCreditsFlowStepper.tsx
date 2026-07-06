import { Heading, Stepper } from '@goodwidget/ui'
import type { StepperStepItem } from '@goodwidget/ui'
import type { AiCreditsWidgetAdapterState } from '../../widgetRuntimeContract'
import type { AiCreditsFlowStep } from './types'
import { mapStatusToActiveStep } from './purchaseFlowUtils'

function hasCreditsBalance(balance: string | null | undefined): boolean {
  return balance !== null && balance !== undefined && Number.parseFloat(balance) > 0
}

interface AiCreditsFlowStepperProps {
  state: AiCreditsWidgetAdapterState
  onStepPress?: (stepId: string) => void
}

/**
 * Wraps the Stepper component with widget-specific steps for the purchase flow.
 */
export function AiCreditsFlowStepper({ state, onStepPress }: AiCreditsFlowStepperProps) {
  const activeStep = mapStatusToActiveStep(state)

  function getStepStatus(
    step: AiCreditsFlowStep,
  ): StepperStepItem['status'] {
    const hasBuyerKey = state.buyerKey !== null && state.buyerKeyConfirmed
    const hasConsent = state.operatorConsentSigned

    switch (step) {
      case 'buyer_key':
        if (hasBuyerKey) return 'completed'
        return activeStep === 'buyer_key' ? 'active' : 'pending'
      case 'consent':
        if (hasConsent) return 'completed'
        if (!hasBuyerKey) return 'pending'
        return activeStep === 'consent' ? 'active' : 'pending'
      case 'pay':
        if (hasCreditsBalance(state.aiCreditsBalance) || state.status === 'payment_confirmed')
          return 'completed'
        if (state.status === 'payment_failed') return 'failed'
        if (!hasConsent) return 'pending'
        return activeStep === 'pay' ? 'active' : 'pending'
      default:
        return 'pending'
    }
  }

  const steps: StepperStepItem[] = [
    {
      id: 'buyer_key',
      title: 'Buyer Key',
      description: 'Generate or provide your AI credits buyer key',
      status: getStepStatus('buyer_key'),
    },
    {
      id: 'consent',
      title: 'Operator Consent',
      description: 'Sign permission for the AntseedBuyerOperator',
      status: getStepStatus('consent'),
    },
    {
      id: 'pay',
      title: 'Buy Credits',
      description:
        state.status === 'payment_pending'
          ? 'Transaction submitted…'
          : state.status === 'payment_confirmed'
            ? 'Settling on Base…'
            : state.status === 'payment_failed'
              ? state.error ?? 'Payment failed'
              : 'Confirm the Celo transaction',
      status: getStepStatus('pay'),
    },
  ]

  return (
    <Stepper
      steps={steps}
      activeStepId={activeStep}
      onStepPress={onStepPress}
      header={
        <Heading level={5} secondary>
          Purchase Flow
        </Heading>
      }
    />
  )
}

