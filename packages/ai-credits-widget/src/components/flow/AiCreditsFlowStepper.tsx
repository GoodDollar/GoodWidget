import { Heading, Stepper } from '@goodwidget/ui'
import type { StepperStepItem } from '@goodwidget/ui'
import type { AiCreditsWidgetAdapterState } from '../../widgetRuntimeContract'
import type { AiCreditsFlowStep } from './types'
import { mapStatusToActiveStep } from './purchaseFlowUtils'

const STEP_ORDER: AiCreditsFlowStep[] = ['buyer_key', 'consent', 'pay']

interface AiCreditsFlowStepperProps {
  state: AiCreditsWidgetAdapterState
  buyerPubKeySaved: boolean
  onStepPress?: (stepId: string) => void
}

export function AiCreditsFlowStepper({
  state,
  buyerPubKeySaved,
  onStepPress,
}: AiCreditsFlowStepperProps) {
  const activeStep = mapStatusToActiveStep(state, buyerPubKeySaved)

  function getStepStatus(step: AiCreditsFlowStep): StepperStepItem['status'] {
    const stepIndex = STEP_ORDER.indexOf(step)
    if (!activeStep) return 'pending'

    const activeIndex = STEP_ORDER.indexOf(activeStep)
    if (activeIndex < 0) return 'pending'

    if (stepIndex > activeIndex) return 'pending'
    if (stepIndex < activeIndex) return 'completed'

    if (step === 'pay' && state.status === 'payment_failed') return 'failed'
    if (step === 'pay' && state.status === 'payment_confirmed') return 'completed'
    return 'active'
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
              ? undefined
              : 'Confirm the Celo transaction',
      status: getStepStatus('pay'),
    },
  ]

  function handleStepPress(stepId: string) {
    const step = steps.find((item) => item.id === stepId)
    if (!step || step.status === 'completed' || step.status === 'pending') return
    onStepPress?.(stepId)
  }

  return (
    <Stepper
      steps={steps}
      activeStepId={activeStep}
      onStepPress={onStepPress ? handleStepPress : undefined}
      header={
        <Heading level={5} secondary>
          Purchase Flow
        </Heading>
      }
    />
  )
}
