/**
 * NextTaskModal — Drawer-based "what's next" prompt, shown on demand via
 * `useNextTaskTrigger().fire(...)` (see @goodwidget/core). It has no `open`
 * prop of its own, so each story below renders a trigger button that fires
 * the same window event a real host integration would, and a small on-screen
 * "last event" readout so interaction tests can assert onShown/onClicked/
 * onDismissed payloads without depending on console output.
 */
import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, within, userEvent, waitFor } from '@storybook/test'
import { useNextTaskTrigger } from '@goodwidget/core'
import { NextTaskModal, Card, Heading, Text, Button, ButtonText } from '@goodwidget/ui'
import type { NextTaskContent } from '@goodwidget/ui'
import { withDefaultPreset } from '../helpers/withDefaultPreset'

const meta: Meta = {
  title: 'Design System/Primitives/NextTaskModal',
  tags: ['autodocs', 'showcase'],
  parameters: { layout: 'padded' },
  decorators: [withDefaultPreset],
}
export default meta
type Story = StoryObj

const contentWithImage: NextTaskContent = {
  title: 'Stake your G$ and earn',
  description: 'Put your claimed G$ to work by staking it for rewards.',
  ctaLabel: 'Start staking',
  ctaTarget: 'https://gooddollar.org/stake',
  imageUrl: 'https://placehold.co/96x96',
  contentId: 'stake-prompt',
}

const contentWithoutImage: NextTaskContent = {
  title: 'Verify your identity',
  description: 'Complete GoodID verification to unlock higher claim limits.',
  ctaLabel: 'Verify now',
  ctaTarget: 'https://gooddollar.org/goodid',
  contentId: 'goodid-prompt',
}

/**
 * Shared story scaffold: a "Fire trigger" button plus a readout of the most
 * recent onShown/onClicked/onDismissed payload, so play()/Playwright can
 * assert exactly what the component reported without reading console logs.
 */
function TriggerHarness({
  content,
  testID,
  resolveNavigation,
}: {
  content: NextTaskContent | null | undefined
  testID: string
  resolveNavigation?: (ctaTarget: string) => boolean | void
}) {
  const { fire } = useNextTaskTrigger()
  const [lastEvent, setLastEvent] = useState('none')

  return (
    <Card style={{ width: 320 }}>
      <Heading level={5}>Trigger</Heading>
      <Text>Fires the same window event a real host integration would.</Text>
      <Button
        data-testid="NextTaskModal-fire-trigger"
        fullWidth
        onPress={() => fire({ source: 'storybook' })}
      >
        <ButtonText>Fire trigger</ButtonText>
      </Button>
      <Text data-testid="NextTaskModal-last-event">{lastEvent}</Text>
      <NextTaskModal
        testID={testID}
        content={content}
        resolveNavigation={resolveNavigation}
        onShown={(payload) => setLastEvent(`shown:${payload.contentId ?? ''}`)}
        onClicked={(payload) => setLastEvent(`clicked:${payload.ctaTarget}`)}
        onDismissed={(payload) => setLastEvent(`dismissed:${payload.reason}`)}
      />
    </Card>
  )
}

/** Closed by default — the modal renders nothing until the trigger fires. */
export const Closed: Story = {
  render: () => <TriggerHarness content={contentWithImage} testID="NextTaskModal-closed" />,
}

/** Firing the trigger opens the modal with image, title, description, and CTA. */
export const ShownWithContent: Story = {
  render: () => <TriggerHarness content={contentWithImage} testID="NextTaskModal-shown" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('NextTaskModal-fire-trigger'))
    const card = await within(document.body).findByTestId('NextTaskModal-shown')
    await expect(within(card).getByText('Stake your G$ and earn')).toBeInTheDocument()
    await expect(canvas.getByTestId('NextTaskModal-last-event')).toHaveTextContent('shown:stake-prompt')
  },
}

/** Content with no `imageUrl` renders without the image slot. */
export const ShownWithoutImage: Story = {
  render: () => <TriggerHarness content={contentWithoutImage} testID="NextTaskModal-no-image" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('NextTaskModal-fire-trigger'))
    const card = await within(document.body).findByTestId('NextTaskModal-no-image')
    await expect(within(card).getByText('Verify your identity')).toBeInTheDocument()
    await expect(within(card).queryByRole('img')).not.toBeInTheDocument()
  },
}

/** `content={null}` — firing the trigger is a no-op; the modal never mounts. */
export const NoContent: Story = {
  render: () => <TriggerHarness content={null} testID="NextTaskModal-no-content" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('NextTaskModal-fire-trigger'))
    await expect(within(document.body).queryByTestId('NextTaskModal-no-content')).not.toBeInTheDocument()
    await expect(canvas.getByTestId('NextTaskModal-last-event')).toHaveTextContent('none')
  },
}

/**
 * Dismissing via the corner close button reports reason "close-button".
 *
 * The Drawer's enter transition briefly leaves its content `pointer-events:
 * none` until the animation settles, so the click is wrapped in `waitFor` to
 * retry past that window rather than racing it (same pattern as the AppKit
 * connect-wallet story's waitFor use for async UI).
 */
export const DismissViaCloseButton: Story = {
  render: () => <TriggerHarness content={contentWithImage} testID="NextTaskModal-dismiss-close" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('NextTaskModal-fire-trigger'))
    const closeButton = await within(document.body).findByRole('button', { name: /close/i })
    await waitFor(() => userEvent.click(closeButton))
    await expect(canvas.getByTestId('NextTaskModal-last-event')).toHaveTextContent('dismissed:close-button')
  },
}

/** Dismissing via the "Skip" link reports reason "skip-link". */
export const DismissViaSkipLink: Story = {
  render: () => <TriggerHarness content={contentWithImage} testID="NextTaskModal-dismiss-skip" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('NextTaskModal-fire-trigger'))
    const skipButton = await within(document.body).findByRole('button', { name: /skip/i })
    await waitFor(() => userEvent.click(skipButton))
    await expect(canvas.getByTestId('NextTaskModal-last-event')).toHaveTextContent('dismissed:skip-link')
  },
}

/**
 * `resolveNavigation` returning `true` means the host fully handled the CTA —
 * the external-link fallback (and its URL validation) never runs.
 *
 * Tamagui's Sheet (which Drawer wraps) keeps its content mounted in the DOM
 * after close by design, animating it out via opacity rather than unmounting
 * it — so "the drawer closed" is asserted with `toBeVisible` (which treats
 * `opacity: 0` as not visible), not `toBeInTheDocument`. The assertion is
 * wrapped in `waitFor` since the opacity change is animated, not instant.
 */
export const HostHandledNavigation: Story = {
  render: () => (
    <TriggerHarness content={contentWithImage} testID="NextTaskModal-host-nav" resolveNavigation={() => true} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('NextTaskModal-fire-trigger'))
    const ctaButton = await within(document.body).findByRole('button', { name: /start staking/i })
    await waitFor(() => userEvent.click(ctaButton))
    await expect(canvas.getByTestId('NextTaskModal-last-event')).toHaveTextContent(
      `clicked:${contentWithImage.ctaTarget}`,
    )
    await waitFor(() => {
      expect(within(document.body).getByTestId('NextTaskModal-host-nav')).not.toBeVisible()
    })
  },
}
