import type { StepperStepItem } from '@goodwidget/ui'
import type { BridgeSubmissionStep } from './useBridgeSubmission'

// Builds the Confirm modal's Stepper rows directly from the SDK's own
// approving/bridging/completed/failed vocabulary (see useBridgeSubmission) —
// there is no separate step-numbering scheme to keep in sync with it.
// Mirrors governance-widget's createTransactionSteps.
export function buildSubmissionSteps(
  step: BridgeSubmissionStep,
  needsApproval: boolean,
  failedAtStep: 'approving' | 'bridging' | null,
  errorMessage: string | null,
): StepperStepItem[] {
  const approveStatus = (): StepperStepItem['status'] => {
    if (failedAtStep === 'approving') return 'failed'
    if (step === 'approving') return 'active'
    if (step === 'idle' || (step === 'failed' && failedAtStep === null)) return 'pending'
    return 'completed'
  }

  const bridgeStatus = (): StepperStepItem['status'] => {
    if (failedAtStep === 'bridging') return 'failed'
    if (step === 'bridging') return 'active'
    if (step === 'completed') return 'completed'
    return 'pending'
  }

  const steps: StepperStepItem[] = []

  if (needsApproval || step === 'approving' || failedAtStep === 'approving') {
    steps.push({
      id: 'approving',
      title: 'Approve G$',
      description: failedAtStep === 'approving' ? errorMessage ?? undefined : 'Confirm the approval in your wallet.',
      status: approveStatus(),
    })
  }

  steps.push({
    id: 'bridging',
    title: 'Send bridge transaction',
    description: failedAtStep === 'bridging' ? errorMessage ?? undefined : 'Confirm the bridge transaction in your wallet.',
    status: bridgeStatus(),
  })

  steps.push({
    id: 'completed',
    title: step === 'completed' ? 'Bridge submitted' : 'Source confirmation',
    description: step === 'completed'
      ? 'The source-chain transaction is confirmed. Delivery on the destination chain follows shortly after.'
      : 'Awaiting confirmation of the source-chain transaction.',
    status: step === 'completed' ? 'completed' : 'pending',
  })

  return steps
}
