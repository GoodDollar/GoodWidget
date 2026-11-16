import React from 'react'
import { Stepper, type StepperStepItem } from '@goodwidget/ui'

export interface ProgressStepsProps {
  stepLabels: string[]
  activeStepIndex: number
}

/** Stepper for the A4 / B3 / C2 progress screens: earlier steps done, the active one running, the rest pending. */
export function ProgressSteps({ stepLabels, activeStepIndex }: ProgressStepsProps) {
  const steps: StepperStepItem[] = stepLabels.map((title, index) => ({
    id: `step-${index}`,
    title,
    status: index < activeStepIndex ? 'completed' : index === activeStepIndex ? 'active' : 'pending',
  }))
  // activeStepId null: the stepper must not scroll the host page
  return <Stepper steps={steps} activeStepId={null} />
}
