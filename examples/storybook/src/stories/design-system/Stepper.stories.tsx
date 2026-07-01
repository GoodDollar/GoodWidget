import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Stepper, Text, YStack, type StepperStepItem } from '@goodwidget/ui'

const STEPS: StepperStepItem[] = [
  { id: 'connect', title: 'Connect wallet', status: 'completed' },
  { id: 'approve', title: 'Approve transaction', status: 'completed' },
  { id: 'submit', title: 'Submit migration', status: 'active', description: 'Waiting for wallet confirmation.' },
  { id: 'bridge', title: 'Bridge to Celo', status: 'pending' },
  { id: 'stake', title: 'Stake on Celo', status: 'pending' },
  { id: 'confirm', title: 'Confirm receipt', status: 'pending' },
]

const meta: Meta<typeof Stepper> = {
  title: 'Design System/Primitives/Stepper',
  component: Stepper,
  tags: ['autodocs', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    activeStepId: {
      control: 'select',
      options: STEPS.map((step) => step.id),
      description: 'Which step is highlighted as active',
    },
    maxHeight: { control: 'number', description: 'Max height of the scrollable step list' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

/** Fixed reference story — the Controls panel is inert here; use "Controllable" below to
 * drive props live. */
export const Default: Story = {
  render: () => (
    <YStack width={420} data-testid="Stepper-default">
      <Stepper
        steps={STEPS}
        activeStepId="submit"
        header={<Text fontWeight="700">Transaction steps</Text>}
        maxHeight={280}
      />
    </YStack>
  ),
}

/** Recomputes each step's status relative to the chosen active step, so moving the
 * `activeStepId` control actually restyles the list instead of only scrolling to it. */
function stepsWithActive(activeStepId: string): StepperStepItem[] {
  const activeIndex = STEPS.findIndex((step) => step.id === activeStepId)
  return STEPS.map((step, index) => ({
    ...step,
    status: index < activeIndex ? 'completed' : index === activeIndex ? 'active' : 'pending',
  }))
}

/** Controllable instance — edit args in the Controls panel. */
export const Controllable: Story = {
  args: {
    activeStepId: 'submit',
    maxHeight: 280,
  },
  render: ({ activeStepId, maxHeight }) => (
    <YStack width={420} data-testid="Stepper-controllable">
      <Stepper
        steps={stepsWithActive(activeStepId ?? 'submit')}
        activeStepId={activeStepId}
        header={<Text fontWeight="700">Transaction steps</Text>}
        maxHeight={maxHeight}
      />
    </YStack>
  ),
}
