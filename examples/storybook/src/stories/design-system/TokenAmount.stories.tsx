/**
 * TokenAmount — displays a formatted token balance with a ticker label.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { TokenAmount, Card, Heading, YStack, XStack } from '@goodwidget/ui'
import { Theme } from '@tamagui/core'
import { withDefaultPreset } from '../helpers/withDefaultPreset'

const meta: Meta<typeof TokenAmount> = {
  title: 'Design System/Primitives/TokenAmount',
  component: TokenAmount,
  tags: ['autodocs', 'showcase'],
  parameters: { layout: 'padded' },
  decorators: [withDefaultPreset],
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

/** Token amounts rendered in Light theme — verifies visible spans and contrasting text. */
export const LightTheme: Story = {
  render: () => (
    <Theme name="light">
      <YStack backgroundColor="$background" padding="$4" borderRadius="$4" width={320} gap="$2">
        <Heading level={5}>Light Theme Amounts</Heading>
        <TokenAmount amount="1234.56" token="G$" size="lg" />
        <TokenAmount amount="100.00" token="USDC" size="md" />
        <TokenAmount amount="42.50" token="CELO" size="sm" variant="secondary" />
      </YStack>
    </Theme>
  ),
}

/** Token amounts rendered in Dark theme. */
export const DarkTheme: Story = {
  render: () => (
    <Theme name="dark">
      <YStack backgroundColor="$background" padding="$4" borderRadius="$4" width={320} gap="$2">
        <Heading level={5}>Dark Theme Amounts</Heading>
        <TokenAmount amount="1234.56" token="G$" size="lg" />
        <TokenAmount amount="100.00" token="USDC" size="md" />
        <TokenAmount amount="42.50" token="CELO" size="sm" variant="secondary" />
      </YStack>
    </Theme>
  ),
}

