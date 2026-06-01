import React, { useMemo, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Button, ButtonText, Stepper, Text, YStack, type StepperStepItem } from '@goodwidget/ui'

const meta: Meta<typeof Stepper> = {
  title: 'Design System/Stepper',
  component: Stepper,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

const BASE_STEPS: StepperStepItem[] = [
  { id: 'connect', title: 'Connect wallet', status: 'completed' },
  { id: 'approve', title: 'Approve transaction', status: 'completed' },
  { id: 'submit', title: 'Submit migration', status: 'active', description: 'Waiting for wallet confirmation.' },
  { id: 'bridge', title: 'Bridge to Celo', status: 'pending' },
  { id: 'stake', title: 'Stake on Celo', status: 'pending' },
  { id: 'confirm', title: 'Confirm receipt', status: 'pending' },
  { id: 'finalize', title: 'Finalize savings', status: 'pending' },
]

export const TransactionFlow: Story = {
  render: () => (
    <YStack width={420}>
      <Stepper
        steps={BASE_STEPS}
        activeStepId="submit"
        header={<Text fontWeight="700">Transaction steps</Text>}
        maxHeight={280}
      />
    </YStack>
  ),
}

export const InteractiveAdvance: Story = {
  render: function InteractiveAdvanceStory() {
    const [activeIndex, setActiveIndex] = useState(2)

    const steps = useMemo(
      () =>
        BASE_STEPS.map((step, index) => {
          if (index < activeIndex) {
            return { ...step, status: 'completed' as const, description: undefined }
          }
          if (index === activeIndex) {
            return {
              ...step,
              status: 'active' as const,
              description: 'Currently in progress.',
            }
          }
          return { ...step, status: 'pending' as const, description: undefined }
        }),
      [activeIndex],
    )

    const activeStepId = steps[activeIndex]?.id ?? null

    return (
      <YStack width={420} gap="$3">
        <Stepper
          steps={steps}
          activeStepId={activeStepId}
          header={<Text fontWeight="700">Interactive transaction flow</Text>}
          maxHeight={280}
        />
        <YStack gap="$2">
          <Button
            disabled={activeIndex >= steps.length - 1}
            onPress={() => setActiveIndex((current) => Math.min(current + 1, steps.length - 1))}
          >
            <ButtonText>Advance step</ButtonText>
          </Button>
          <Button
            variant="secondary"
            disabled={activeIndex <= 0}
            onPress={() => setActiveIndex((current) => Math.max(current - 1, 0))}
          >
            <ButtonText>Previous step</ButtonText>
          </Button>
        </YStack>
      </YStack>
    )
  },
}
