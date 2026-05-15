/**
 * TokenAmount — displays a formatted token balance with a ticker label.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { TokenAmount, Card, Heading, YStack } from '@goodwidget/ui'

const meta: Meta<typeof TokenAmount> = {
  title: 'Primitives/TokenAmount',
  component: TokenAmount,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    amount: { control: 'text', description: 'Token amount to display' },
    token: { control: 'text', description: 'Token ticker symbol' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Display size variant',
    },
    decimals: { control: 'number', description: 'Number of decimal places' },
  },
}
export default meta
type Story = StoryObj<typeof TokenAmount>

/** Default token amount display. */
export const Default: Story = {
  args: {
    amount: '1234.56',
    token: 'G$',
  },
  render: (args) => (
    <Card data-testid="TokenAmount-default" style={{ width: 320 }}>
      <Heading level={5}>Amounts</Heading>
      <YStack gap="$2">
        <TokenAmount {...args} />
        <TokenAmount amount="0" token="ETH" />
        <TokenAmount amount="1000000" token="USDC" />
      </YStack>
    </Card>
  ),
}

/** Controllable instance — edit args in the Controls panel. */
export const Controllable: Story = {
  args: {
    amount: '42.00',
    token: 'G$',
  },
}
