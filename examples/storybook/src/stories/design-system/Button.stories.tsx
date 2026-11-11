/**
 * Button — primary interactive action primitive.
 *
 * Covers all variants (primary, secondary, outline, ghost, pill, text, list)
 * verified across Light and Dark themes.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Button, ButtonText, PillText, Card, Heading, Text, YStack, XStack } from '@goodwidget/ui'
import { Theme } from '@tamagui/core'
import { withDefaultPreset } from '../helpers/withDefaultPreset'

const meta: Meta<typeof Button> = {
  title: 'Design System/Primitives/Button',
  component: Button,
  tags: ['autodocs', 'showcase'],
  parameters: { layout: 'padded' },
  decorators: [withDefaultPreset],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'pill', 'text', 'list'],
      description: 'Button visual variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Button size scale',
    },
    disabled: { control: 'boolean', description: 'Disabled state' },
    fullWidth: { control: 'boolean', description: 'Full width expand' },
  },
}
export default meta
type Story = StoryObj<typeof Button>

const ButtonMatrix = ({ label }: { label: string }) => (
  <Card style={{ width: 360, gap: 12 }}>
    <Heading level={5}>{label}</Heading>
    <YStack gap="$2">
      <Button variant="primary">
        <ButtonText>Primary Button</ButtonText>
      </Button>
      <Button variant="secondary">
        <ButtonText>Secondary Button</ButtonText>
      </Button>
      <Button variant="outline">
        <ButtonText>Outline Button</ButtonText>
      </Button>
      <Button variant="ghost">
        <ButtonText>Ghost Button</ButtonText>
      </Button>
      <Button variant="pill">
        <PillText>Pill Button</PillText>
      </Button>
      <Button variant="text">
        <ButtonText>Text Link Button</ButtonText>
      </Button>
      <Button variant="list">
        <ButtonText>List Item Button</ButtonText>
      </Button>
    </YStack>
  </Card>
)

/** Default Button rendering. */
export const Default: Story = {
  render: () => (
    <Button variant="primary">
      <ButtonText>Primary Button</ButtonText>
    </Button>
  ),
}

/** All variants in Light theme — verifies non-primary buttons render readable dark text. */
export const LightThemeVariants: Story = {
  render: () => (
    <Theme name="light">
      <YStack backgroundColor="$background" padding="$4" borderRadius="$4">
        <ButtonMatrix label="Light Theme Button Variants" />
      </YStack>
    </Theme>
  ),
}

/** All variants in Dark theme — verifies readability and contrast. */
export const DarkThemeVariants: Story = {
  render: () => (
    <Theme name="dark">
      <YStack backgroundColor="$background" padding="$4" borderRadius="$4">
        <ButtonMatrix label="Dark Theme Button Variants" />
      </YStack>
    </Theme>
  ),
}

/** Side-by-side comparison between Light and Dark themes. */
export const SideBySideComparison: Story = {
  render: () => (
    <XStack gap="$4" flexWrap="wrap">
      <Theme name="light">
        <YStack backgroundColor="$background" padding="$4" borderRadius="$4">
          <ButtonMatrix label="Light Theme" />
        </YStack>
      </Theme>
      <Theme name="dark">
        <YStack backgroundColor="$background" padding="$4" borderRadius="$4">
          <ButtonMatrix label="Dark Theme" />
        </YStack>
      </Theme>
    </XStack>
  ),
}
