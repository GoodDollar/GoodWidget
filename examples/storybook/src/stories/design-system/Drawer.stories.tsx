/**
 * Drawer — bottom-sheet overlay triggered by a button.
 *
 * This story includes a play function that opens the Drawer via a button click
 * to demonstrate interaction testing with Storybook.
 */
import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, within, userEvent } from '@storybook/test'
import { Drawer, Card, Heading, Text, Button, ButtonText, YStack } from '@goodwidget/ui'

const meta: Meta = {
  title: 'Primitives/Drawer',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj

/** Controlled Drawer triggered by a button. */
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
    // After clicking, the Close button should appear inside the Drawer
    await expect(canvas.getByRole('button', { name: /close/i })).toBeDefined()
  },
}
