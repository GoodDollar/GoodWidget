import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Stepper, Text, YStack, type StepperStepItem } from '@goodwidget/ui'

const meta: Meta<typeof Stepper> = {
  title: 'Design System/Stepper',
  component: Stepper,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

const STEPS: StepperStepItem[] = [
  { id: 'connect', title: 'Connect wallet', status: 'completed' },
  { id: 'approve', title: 'Approve transaction', status: 'completed' },
  { id: 'submit', title: 'Submit migration', status: 'active', description: 'Waiting for wallet confirmation.' },
  { id: 'bridge', title: 'Bridge to Celo', status: 'pending' },
  { id: 'stake', title: 'Stake on Celo', status: 'pending' },
  { id: 'confirm', title: 'Confirm receipt', status: 'pending' },
]

export const TransactionFlow: Story = {
  render: () => (
    <YStack width={420}>
      <Stepper
        steps={STEPS}
        activeStepId="submit"
        header={<Text fontWeight="700">Transaction steps</Text>}
        maxHeight={280}
      />
    </YStack>
  ),
}
