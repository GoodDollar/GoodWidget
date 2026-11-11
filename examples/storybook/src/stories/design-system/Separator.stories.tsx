/**
 * Separator — divider line primitive.
 *
 * Covers horizontal sizes (sm: 1px, md: 2px, lg: 4px), color variants
 * (default, muted, primary), and vertical orientation.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Separator, Card, Heading, Text, YStack, XStack } from '@goodwidget/ui'
import { Theme } from '@tamagui/core'
import { withDefaultPreset } from '../helpers/withDefaultPreset'

const meta: Meta<typeof Separator> = {
  title: 'Design System/Primitives/Separator',
  component: Separator,
  tags: ['autodocs', 'showcase'],
  parameters: { layout: 'padded' },
  decorators: [withDefaultPreset],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Separator thickness variant',
    },
    color: {
      control: 'select',
      options: ['default', 'muted', 'primary'],
      description: 'Color style variant',
    },
    vertical: { control: 'boolean', description: 'Vertical orientation' },
  },
}
export default meta
type Story = StoryObj<typeof Separator>

const SeparatorMatrix = ({ label }: { label: string }) => (
  <Card style={{ width: 360, gap: 12 }}>
    <Heading level={5}>{label}</Heading>
    <YStack gap="$3">
      <Text tone="secondary">Horizontal sm (1px)</Text>
      <Separator size="sm" />

      <Text tone="secondary">Horizontal md (2px)</Text>
      <Separator size="md" />

      <Text tone="secondary">Horizontal lg (4px)</Text>
      <Separator size="lg" />

      <Text tone="secondary">Primary color</Text>
      <Separator size="md" color="primary" />

      <Text tone="secondary">Muted color</Text>
      <Separator size="md" color="muted" />

      <Text tone="secondary">Vertical separator in flex row</Text>
      <XStack height={40} alignItems="center" gap="$3">
        <Text>Left</Text>
        <Separator vertical />
        <Text>Middle</Text>
        <Separator vertical color="primary" />
        <Text>Right</Text>
      </XStack>
    </YStack>
  </Card>
)

/** Default Separator. */
export const Default: Story = {
  render: () => (
    <YStack width={300} gap="$2">
      <Text>Above</Text>
      <Separator />
      <Text>Below</Text>
    </YStack>
  ),
}

/** Horizontal sizes and colors in Light theme. */
export const LightTheme: Story = {
  render: () => (
    <Theme name="light">
      <YStack backgroundColor="$background" padding="$4" borderRadius="$4">
        <SeparatorMatrix label="Light Theme Separators" />
      </YStack>
    </Theme>
  ),
}

/** Horizontal sizes and colors in Dark theme. */
export const DarkTheme: Story = {
  render: () => (
    <Theme name="dark">
      <YStack backgroundColor="$background" padding="$4" borderRadius="$4">
        <SeparatorMatrix label="Dark Theme Separators" />
      </YStack>
    </Theme>
  ),
}
