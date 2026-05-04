import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { SavingsWidget } from '@goodwidget/savings-widget'
import { YStack } from '@goodwidget/ui'
import { createCustodialEip1193Provider } from '../fixtures/custodialEip1193'

const mockProvider = createCustodialEip1193Provider()

const meta: Meta<typeof SavingsWidget> = {
  title: 'Widgets/SavingsWidget',
  component: SavingsWidget,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}

export default meta

type Story = StoryObj<typeof SavingsWidget>

export const Default: Story = {
  render: () => (
    <YStack style={{ width: 420 }}>
      <SavingsWidget provider={mockProvider} />
    </YStack>
  ),
}

export const Disconnected: Story = {
  render: () => (
    <YStack style={{ width: 420 }}>
      <SavingsWidget connectWallet={() => undefined} />
    </YStack>
  ),
}
