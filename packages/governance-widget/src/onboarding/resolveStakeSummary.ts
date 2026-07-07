import type { StepperStepItem } from '@goodwidget/ui'

export interface StakeSummary {
  title: string
  badgeType: 'info' | 'warning' | 'success'
  description: string
}

export function resolveStakeSummary(transactionSteps: StepperStepItem[]): StakeSummary {
  const failedStep = transactionSteps.find(
    (step) => step.status === 'failed' || step.status === 'attention',
  )
  if (failedStep) {
    return {
      title: 'Action required',
      badgeType: 'warning',
      description:
        failedStep.description ??
        'A stake transaction needs attention before governance onboarding can finish.',
    }
  }

  const activeStep = transactionSteps.find((step) => step.status === 'active')
  if (activeStep) {
    return {
      title: 'Transaction in progress',
      badgeType: 'info',
      description:
        activeStep.description ??
        'The next governance transaction is currently waiting for confirmation.',
    }
  }

  const allCompleted =
    transactionSteps.length > 0 &&
    transactionSteps.every((step) => step.status === 'completed')
  if (allCompleted) {
    return {
      title: 'Stake confirmed',
      badgeType: 'success',
      description:
        'All presentational transaction states are completed and the member can move to the final success state.',
    }
  }

  return {
    title: 'Stake not yet started',
    badgeType: 'info',
    description:
      'The membership stake has not been submitted yet. Continue from the profile step to begin the transaction flow.',
  }
}
