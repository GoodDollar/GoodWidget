/**
 * GlowCard — Card variant with animated glow border.
 *
 * The glow colour is driven by the `primaryLight` theme token.
 * Used as the container for the ClaimWidget action area.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { GlowCard, Heading, Text } from '@goodwidget/ui'

const meta: Meta<typeof GlowCard> = {
  title: 'Design System/Primitives/GlowCard',
  component: GlowCard,
  tags: ['autodocs', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    elevated: { control: 'boolean', description: 'Applies the elevated shadow variant' },
    outlined: { control: 'boolean', description: 'Applies the outlined border variant' },
  },
}
export default meta
type Story = StoryObj<typeof GlowCard>

/** Default GlowCard with theme-driven glow colour. */
export const Default: Story = {
  render: () => (
    <GlowCard data-testid="GlowCard-default" style={{ width: 320 }}>
      <Heading level={4}>GlowCard</Heading>
      <Text>
        A Card variant with an animated glow effect driven by the <Text bold>primaryLight</Text>{' '}
        theme token. Used as the container for the ClaimWidget action.
      </Text>
    </GlowCard>
  ),
}

/** Controllable instance — edit args in the Controls panel. */
export const Controllable: Story = {
  args: {
    elevated: true,
    outlined: false,
  },
  render: (args) => (
    <GlowCard data-testid="GlowCard-controllable" style={{ width: 320 }} {...args}>
      <Heading level={4}>Controllable GlowCard</Heading>
      <Text>Use the Controls panel to toggle variants.</Text>
    </GlowCard>
  ),
}
