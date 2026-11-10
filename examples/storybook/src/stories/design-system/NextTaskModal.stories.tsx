/**
 * NextTaskModal — controlled bottom sheet that recommends one next action.
 *
 * The host owns `open`/`content`/`onClose`, so each story renders a button that
 * opens the sheet and a small "last event" readout, letting play()/Playwright
 * assert what the component reported without reading console output.
 *
 * CTA navigation contract (the host handles it, or an Anchor does — never both):
 * - `resolveNavigation` passed: the CTA is a Button and the host owns navigation
 *   entirely. `ctaTarget` is handed over untouched; the modal opens no link itself.
 * - `resolveNavigation` absent: the CTA is an Anchor to `ctaTarget` (http/https
 *   only). A rejected URL renders a Button that shows an error toast instead.
 * - A handler that throws or rejects shows an error toast; the modal still closes.
 * Error toasts need a mounted `<ToastContainer />`, which every story here mounts.
 */
import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, within, userEvent, waitFor } from '@storybook/test'
import { NextTaskModal, ToastContainer, Card, Heading, Text, Button, ButtonText } from '@goodwidget/ui'
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

const SAMPLE_IMAGE_URL =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="%23243242"/></svg>'

const contentWithImage: NextTaskContent = {
  title: 'Stake your G$ and earn',
  description: 'Put your claimed G$ to work by staking it for rewards.',
  ctaLabel: 'Open Proposal',
  ctaTarget: 'https://gooddollar.org/stake',
  imageUrl: SAMPLE_IMAGE_URL,
  contentId: 'stake-prompt',
}

const contentWithoutImage: NextTaskContent = {
  title: 'Verify your identity',
  description: 'Complete GoodID verification to unlock higher claim limits.',
  ctaLabel: 'Verify now',
  ctaTarget: 'https://gooddollar.org/goodid',
  contentId: 'goodid-prompt',
}

const contentWithRejectedUrl: NextTaskContent = {
  ...contentWithoutImage,
  ctaTarget: 'javascript:alert(1)',
  contentId: 'rejected-url-prompt',
}

/**
 * Shared story scaffold: an "Open next task" button, a readout of the most
 * recent onShown/onClicked/onDismissed payload, and a mounted ToastContainer.
 */
function ControlledHarness({
  content,
  testID,
  resolveNavigation,
}: {
  content: NextTaskContent | null | undefined
  testID: string
  resolveNavigation?: (ctaTarget: string) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [lastEvent, setLastEvent] = useState('none')

  return (
    <Card style={{ width: 320 }}>
      <Heading level={5}>Next task</Heading>
      <Text>The host controls `open`; the modal reports what the user did.</Text>
      <Button data-testid="NextTaskModal-open" fullWidth onPress={() => setOpen(true)}>
        <ButtonText>Open next task</ButtonText>
      </Button>
      <Text data-testid="NextTaskModal-last-event">{lastEvent}</Text>
      <Text data-testid="NextTaskModal-open-state">{open ? 'open' : 'closed'}</Text>
      <NextTaskModal
        testID={testID}
        open={open}
        content={content}
        onClose={() => setOpen(false)}
        resolveNavigation={resolveNavigation}
        onShown={(payload) => setLastEvent(`shown:${payload.contentId ?? ''}`)}
        onClicked={(payload) => setLastEvent(`clicked:${payload.ctaTarget}`)}
        onDismissed={(payload) => setLastEvent(`dismissed:${payload.reason}`)}
        statusLabel="Claim completed"
      />
      <ToastContainer />
    </Card>
  )
}

/** Opens the sheet from the harness button and returns the card root. */
async function openAndGetCard(canvasElement: HTMLElement, testID: string) {
  await userEvent.click(within(canvasElement).getByTestId('NextTaskModal-open'))
  return within(document.body).findByTestId(testID)
}

/**
 * Stops anchor clicks from navigating while still letting React's onClick run
 * (the document listener fires after React's root listener), so Anchor mode can
 * be exercised without leaving the page. Returns a restore function.
 */
function blockLinkNavigation() {
  const preventNavigation = (event: Event) => {
    if ((event.target as HTMLElement | null)?.closest('a')) event.preventDefault()
  }
  document.addEventListener('click', preventNavigation)
  return () => document.removeEventListener('click', preventNavigation)
}

/** Closed by default — the modal renders nothing until the host opens it. */
export const Closed: Story = {
  render: () => <ControlledHarness content={contentWithImage} testID="NextTaskModal-closed" />,
}

/** Opening shows the status pill, headline, recommendation card and CTA. */
export const ShownWithContent: Story = {
  render: () => <ControlledHarness content={contentWithImage} testID="NextTaskModal-shown" />,
  play: async ({ canvasElement }) => {
    const card = await openAndGetCard(canvasElement, 'NextTaskModal-shown')
    await expect(within(card).getByText('Stake your G$ and earn')).toBeInTheDocument()
    await expect(within(document.body).getByText('Claim completed')).toBeInTheDocument()
    await expect(within(document.body).getByText('One good next step')).toBeInTheDocument()
    await expect(within(canvasElement).getByTestId('NextTaskModal-last-event')).toHaveTextContent(
      'shown:stake-prompt',
    )
  },
}

/** Content with no `imageUrl` renders without the image slot. */
export const ShownWithoutImage: Story = {
  render: () => <ControlledHarness content={contentWithoutImage} testID="NextTaskModal-no-image" />,
  play: async ({ canvasElement }) => {
    const card = await openAndGetCard(canvasElement, 'NextTaskModal-no-image')
    await expect(within(card).getByText('Verify your identity')).toBeInTheDocument()
    await expect(within(card).queryByRole('img')).not.toBeInTheDocument()
  },
}

/** `content={null}` — opening is a no-op; the modal never mounts. */
export const NoContent: Story = {
  render: () => <ControlledHarness content={null} testID="NextTaskModal-no-content" />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByTestId('NextTaskModal-open'))
    await expect(within(document.body).queryByTestId('NextTaskModal-no-content')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(within(canvasElement).getByTestId('NextTaskModal-open-state')).toHaveTextContent('closed'),
    )
    await expect(within(canvasElement).getByTestId('NextTaskModal-last-event')).toHaveTextContent('none')
  },
}

/**
 * The Drawer's close button, swipe-down and overlay press all share one `onClose`, so they
 * report the same reason ("overlay"). The shared Drawer is intentionally not changed.
 *
 * The Drawer's enter transition briefly leaves its content `pointer-events: none` until the
 * animation settles, so clicks are wrapped in `waitFor` to retry past that window.
 */
export const DismissViaDrawerClose: Story = {
  render: () => <ControlledHarness content={contentWithImage} testID="NextTaskModal-dismiss-close" />,
  play: async ({ canvasElement }) => {
    await openAndGetCard(canvasElement, 'NextTaskModal-dismiss-close')
    const closeButton = await within(document.body).findByRole('button', { name: /close/i })
    await waitFor(() => userEvent.click(closeButton))
    await expect(within(canvasElement).getByTestId('NextTaskModal-last-event')).toHaveTextContent(
      'dismissed:overlay',
    )
    await expect(within(canvasElement).getByTestId('NextTaskModal-open-state')).toHaveTextContent('closed')
  },
}

/** Dismissing via "Skip for now" reports reason "skip-link" and flips `open` to false. */
export const DismissViaSkipLink: Story = {
  render: () => <ControlledHarness content={contentWithImage} testID="NextTaskModal-dismiss-skip" />,
  play: async ({ canvasElement }) => {
    await openAndGetCard(canvasElement, 'NextTaskModal-dismiss-skip')
    const skipButton = await within(document.body).findByRole('button', { name: /skip for now/i })
    await waitFor(() => userEvent.click(skipButton))
    await expect(within(canvasElement).getByTestId('NextTaskModal-last-event')).toHaveTextContent(
      'dismissed:skip-link',
    )
    await expect(within(canvasElement).getByTestId('NextTaskModal-open-state')).toHaveTextContent('closed')
  },
}

/**
 * No `resolveNavigation`: the CTA is an Anchor whose `href` is the CTA target. Navigation
 * is blocked in the test; the Anchor still reports the click and the sheet closes.
 */
export const ExternalLink: Story = {
  render: () => <ControlledHarness content={contentWithImage} testID="NextTaskModal-external-link" />,
  play: async ({ canvasElement }) => {
    const restoreNavigation = blockLinkNavigation()
    try {
      const card = await openAndGetCard(canvasElement, 'NextTaskModal-external-link')
      const cta = await within(document.body).findByRole('link', { name: 'Open Proposal' })
      await expect(cta).toHaveAttribute('href', contentWithImage.ctaTarget)
      await expect(within(card).queryByRole('link')).not.toBeInTheDocument()
      await waitFor(() => userEvent.click(cta))
      await expect(within(canvasElement).getByTestId('NextTaskModal-last-event')).toHaveTextContent(
        `clicked:${contentWithImage.ctaTarget}`,
      )
      await expect(within(canvasElement).getByTestId('NextTaskModal-open-state')).toHaveTextContent('closed')
    } finally {
      restoreNavigation()
    }
  },
}

/**
 * `resolveNavigation` passed: the CTA is a Button, the host receives `ctaTarget` untouched,
 * and no link is opened by the modal.
 */
export const HostNavigation: Story = {
  render: () => {
    const navigatedTargets: string[] = []
    return (
      <ControlledHarness
        content={contentWithImage}
        testID="NextTaskModal-host-nav"
        resolveNavigation={(ctaTarget) => {
          navigatedTargets.push(ctaTarget)
          document.body.dataset.nextTaskNavigated = navigatedTargets.join(',')
        }}
      />
    )
  },
  play: async ({ canvasElement }) => {
    delete document.body.dataset.nextTaskNavigated
    await openAndGetCard(canvasElement, 'NextTaskModal-host-nav')
    await expect(within(document.body).queryByRole('link', { name: 'Open Proposal' })).not.toBeInTheDocument()
    const cta = await within(document.body).findByRole('button', { name: 'Open Proposal' })
    await waitFor(() => userEvent.click(cta))
    await waitFor(() => expect(document.body.dataset.nextTaskNavigated).toBe(contentWithImage.ctaTarget))
    await expect(within(canvasElement).getByTestId('NextTaskModal-last-event')).toHaveTextContent(
      `clicked:${contentWithImage.ctaTarget}`,
    )
    await expect(within(canvasElement).getByTestId('NextTaskModal-open-state')).toHaveTextContent('closed')
  },
}

const contentWithCustomCopy: NextTaskContent = {
  ...contentWithImage,
  headline: 'Custom Headline Step',
  supportingCopy: 'Custom supporting message for active community members.',
  recommendedLabel: 'FEATURED',
  skipLabel: 'Not now, thanks',
  statusLabel: 'Verification complete',
}

const contentWithRealisticLongCopy: NextTaskContent = {
  title: 'Participate in the GoodDollar Community Expansion & Micro-Grants Initiative',
  description:
    'Read through the extensive proposal detailing the upcoming treasury distribution to regional ambassadors and liquidity pools across multiple EVM ecosystems, cast your vote, and join our active discussion forums.',
  ctaLabel: 'Read and vote on Snapshot',
  ctaTarget: 'https://gooddollar.org/governance/proposal-123',
  imageUrl: 'https://placehold.co/96x96',
  contentId: 'governance-long-copy',
  headline: 'Support Community Expansion Proposals',
  supportingCopy:
    'Every citizen vote shapes the next generation of financial inclusion. Review all active proposals before making your choice.',
  recommendedLabel: 'ACTIVE VOTE',
  skipLabel: 'Remind me tomorrow',
  statusLabel: 'Claim successfully processed',
}

/** A synchronous handler that throws shows an error toast; the sheet stays open so the user can retry or dismiss. */
export const NavigationError: Story = {
  render: () => (
    <ControlledHarness
      content={contentWithImage}
      testID="NextTaskModal-nav-error"
      resolveNavigation={() => {
        throw new Error('router unavailable')
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    await openAndGetCard(canvasElement, 'NextTaskModal-nav-error')
    const cta = await within(document.body).findByRole('button', { name: 'Open Proposal' })
    await waitFor(() => userEvent.click(cta))
    await expect(
      await within(document.body).findByText('Could not open this link. Please try again.'),
    ).toBeInTheDocument()
    await expect(within(canvasElement).getByTestId('NextTaskModal-open-state')).toHaveTextContent('open')
  },
}

/** An async handler that rejects shows the same error toast as a synchronous throw, and keeps the drawer open. */
export const NavigationRejected: Story = {
  render: () => (
    <ControlledHarness
      content={contentWithImage}
      testID="NextTaskModal-nav-rejected"
      resolveNavigation={() => Promise.reject(new Error('navigation rejected'))}
    />
  ),
  play: async ({ canvasElement }) => {
    await openAndGetCard(canvasElement, 'NextTaskModal-nav-rejected')
    const cta = await within(document.body).findByRole('button', { name: 'Open Proposal' })
    await waitFor(() => userEvent.click(cta))
    await expect(
      await within(document.body).findByText('Could not open this link. Please try again.'),
    ).toBeInTheDocument()
    await expect(within(canvasElement).getByTestId('NextTaskModal-open-state')).toHaveTextContent('open')
  },
}

/** No handler and a non-http(s) `ctaTarget`: no Anchor is rendered; pressing shows an error toast and keeps the drawer open. */
export const RejectedUrl: Story = {
  render: () => <ControlledHarness content={contentWithRejectedUrl} testID="NextTaskModal-rejected-url" />,
  play: async ({ canvasElement }) => {
    await openAndGetCard(canvasElement, 'NextTaskModal-rejected-url')
    await expect(within(document.body).queryByRole('link', { name: 'Verify now' })).not.toBeInTheDocument()
    const cta = await within(document.body).findByRole('button', { name: 'Verify now' })
    await waitFor(() => userEvent.click(cta))
    await expect(await within(document.body).findByText('This link cannot be opened.')).toBeInTheDocument()
    await expect(within(canvasElement).getByTestId('NextTaskModal-last-event')).not.toHaveTextContent('clicked')
    await expect(within(canvasElement).getByTestId('NextTaskModal-open-state')).toHaveTextContent('open')
  },
}

/** Configurable copy overrides: custom headline, supporting copy, labels and status. */
export const CustomCopy: Story = {
  render: () => <ControlledHarness content={contentWithCustomCopy} testID="NextTaskModal-custom-copy" />,
  play: async ({ canvasElement }) => {
    await openAndGetCard(canvasElement, 'NextTaskModal-custom-copy')
    await expect(within(document.body).getByText('Custom Headline Step')).toBeInTheDocument()
    await expect(within(document.body).getByText('Custom supporting message for active community members.')).toBeInTheDocument()
    await expect(within(document.body).getByText('FEATURED')).toBeInTheDocument()
    await expect(within(document.body).getByText('Not now, thanks')).toBeInTheDocument()
    await expect(within(document.body).getByText('Verification complete')).toBeInTheDocument()
  },
}

/** Realistic long copy with inner scrolling for responsive testing. */
export const RealisticLongCopy: Story = {
  render: () => <ControlledHarness content={contentWithRealisticLongCopy} testID="NextTaskModal-long-copy" />,
}

/** A slow handler that fails first time and succeeds second time, for testing double-press guard and retry. */
export const NavigationPendingAndRetry: Story = {
  render: () => {
    let callCount = 0
    let shouldFail = true
    return (
      <ControlledHarness
        content={contentWithImage}
        testID="NextTaskModal-pending-retry"
        resolveNavigation={async () => {
          callCount++
          if (typeof document !== 'undefined') {
            document.body.dataset.nextTaskCallCount = String(callCount)
          }
          if (shouldFail) {
            shouldFail = false
            await new Promise((resolve) => setTimeout(resolve, 200))
            throw new Error('temporary failure')
          }
          await new Promise((resolve) => setTimeout(resolve, 200))
        }}
      />
    )
  },
}
