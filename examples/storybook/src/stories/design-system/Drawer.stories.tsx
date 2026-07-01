/**
 * Drawer — bottom-sheet overlay triggered by a button.
 *
 * This story includes a play function that opens the Drawer via a button click
 * to demonstrate interaction testing with Storybook.
 */
import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, screen, within, userEvent } from '@storybook/test'
import { Drawer, Card, Heading, Text, Button, ButtonText, YStack } from '@goodwidget/ui'

const meta: Meta = {
  title: 'Design System/Primitives/Drawer',
  tags: ['autodocs', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    height: {
      control: 'radio',
      options: ['half', 'full'],
      description: 'How much of the viewport the Drawer covers when open',
    },
  },
}
export default meta
type Story = StoryObj

/** Controlled Drawer triggered by a button. Fixed reference story (has an interaction
 * test) — the Controls panel is inert here; use "Controllable" below to drive props live. */
export const Default: Story = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(false)
    return (
      <Card data-testid="Drawer-trigger" style={{ width: 320 }}>
        <Heading level={5}>Trigger</Heading>
        <Text>A Drawer slides up from the bottom and overlays the content.</Text>
        <Button fullWidth onPress={() => setOpen(true)}>
          <ButtonText>Open Drawer</ButtonText>
        </Button>
        <Drawer open={open} onClose={() => setOpen(false)}>
          <YStack gap="$4">
            <Text>Drawer content. Close via the button below or tap outside.</Text>
            <Button fullWidth onPress={() => setOpen(false)}>
              <ButtonText>Close</ButtonText>
            </Button>
          </YStack>
        </Drawer>
      </Card>
    )
  },
  /** Interaction test: click "Open Drawer" and verify the Drawer opens. */
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole('button', { name: /open drawer/i })
    await userEvent.click(trigger)
    // Drawer content is portaled, so query the document-level screen instead of the canvas.
    await expect(await screen.findByRole('button', { name: /close/i })).toBeVisible()
  },
}

/** Controllable instance — edit the `height` arg, then click "Open Drawer". */
export const Controllable: Story = {
  args: {
    height: 'half',
  },
  render: ({ height }: { height?: 'half' | 'full' }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(false)
    return (
      <Card data-testid="Drawer-controllable-trigger" style={{ width: 320 }}>
        <Heading level={5}>Trigger</Heading>
        <Text>A Drawer slides up from the bottom and overlays the content.</Text>
        <Button fullWidth onPress={() => setOpen(true)}>
          <ButtonText>Open Drawer</ButtonText>
        </Button>
        <Drawer open={open} onClose={() => setOpen(false)} height={height}>
          <YStack gap="$4">
            <Text>Drawer content. Close via the button below or tap outside.</Text>
            <Button fullWidth onPress={() => setOpen(false)}>
              <ButtonText>Close</ButtonText>
            </Button>
          </YStack>
        </Drawer>
      </Card>
    )
  },
}
