/**
 * Card — primary surface primitive.
 *
 * Uses the base theme background, border, and shadow.
 * Override via the `light_Card` / `dark_Card` component sub-theme.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Card, Heading, Text, Button, ButtonText, YStack } from '@goodwidget/ui'

const meta: Meta<typeof Card> = {
  title: 'Design System/Primitives/Card',
  component: Card,
  tags: ['autodocs', 'showcase'],
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<typeof Card>

/** Default Card using base theme values. */
export const Default: Story = {
  render: () => (
    <Card data-testid="Card-default" style={{ width: 320 }}>
      <Heading level={5}>Default Card</Heading>
      <Text>
        Uses base theme background, border, and shadow. Override via the Card component sub-theme.
      </Text>
    </Card>
  ),
}

/** Card with a child Button — composing primitives. */
export const WithAction: Story = {
  render: () => (
    <Card data-testid="Card-withAction" style={{ width: 320 }}>
      <Heading level={5}>Card with Action</Heading>
      <Text secondary>A card composed with a button child.</Text>
      <Button fullWidth>
        <ButtonText>Take Action</ButtonText>
      </Button>
    </Card>
  ),
}

/** Card styled with inline props — highest-specificity override layer. */
export const InlineStyled: Story = {
  render: () => (
    <Card
      data-testid="Card-inline"
      backgroundColor="#1A1A2E"
      borderColor="#7B61FF"
      borderWidth={2}
      style={{ width: 320 }}
    >
      <Heading level={4} color="#E0E0FF">
        Inline-styled Card
      </Heading>
      <Text color="#B0B0D0">Per-instance styling via inline props (highest specificity).</Text>
    </Card>
  ),
}
