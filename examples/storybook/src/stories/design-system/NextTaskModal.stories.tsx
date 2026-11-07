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

const contentWithImage: NextTaskContent = {
  title: 'Stake your G$ and earn',
  description: 'Put your claimed G$ to work by staking it for rewards.',
  ctaLabel: 'Open Proposal',
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

/** A synchronous handler that throws shows an error toast; the sheet remains open for retry or dismissal. */
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
    const skipButton = await within(document.body).findByRole('button', { name: /skip for now/i })
    await waitFor(() => userEvent.click(skipButton))
    await expect(within(canvasElement).getByTestId('NextTaskModal-open-state')).toHaveTextContent('closed')
  },
}

/** An async handler that rejects shows an error toast; the sheet remains open. */
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

/** No handler and a non-http(s) `ctaTarget`: no Anchor is rendered; pressing shows an error toast while sheet stays open. */
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

/** Configurable copy: headline, supportingCopy, recommendedLabel, skipLabel and statusLabel custom overrides. */
export const ConfigurableCopy: Story = {
  render: () => (
    <ControlledHarness
      content={{
        ...contentWithImage,
        headline: 'Your personalized mission',
        supportingCopy: 'Complete impactful actions across the community.',
        recommendedLabel: 'COMMUNITY CHOICE',
        skipLabel: 'Maybe next time',
        statusLabel: 'Verification passed',
      }}
      testID="NextTaskModal-configurable-copy"
    />
  ),
  play: async ({ canvasElement }) => {
    const card = await openAndGetCard(canvasElement, 'NextTaskModal-configurable-copy')
    await expect(within(document.body).getByText('Your personalized mission')).toBeInTheDocument()
    await expect(within(document.body).getByText('Complete impactful actions across the community.')).toBeInTheDocument()
    await expect(within(card).getByText('COMMUNITY CHOICE')).toBeInTheDocument()
    await expect(within(document.body).getByText('Maybe next time')).toBeInTheDocument()
    await expect(within(document.body).getByText('Verification passed')).toBeInTheDocument()
  },
}

/** Realistic long copy: long titles, descriptions, and custom labels to test wrapping and responsiveness. */
export const RealisticLongCopy: Story = {
  render: () => (
    <ControlledHarness
      content={{
        title: 'Participate in GoodDollar Community Governance Proposal #42: Expansion of Digital UBI Allocation Across Emerging Markets',
        description: 'Vote on key community parameters including reserve ratio adjustments, liquidity incentives on decentralized exchanges, and grant allocations for regional educational initiatives.',
        ctaLabel: 'Review and Cast Your Vote on Snapshot',
        ctaTarget: 'https://gooddollar.org/governance',
        imageUrl: 'https://placehold.co/96x96',
        headline: 'Maximize your governance influence in the community',
        supportingCopy: 'Decentralized decision making relies on active token holders participating in every vote cycle.',
        recommendedLabel: 'GOVERNANCE VOTE',
        skipLabel: 'Decide later during voting window',
        statusLabel: 'Identity verified on Celo',
      }}
      testID="NextTaskModal-realistic-copy"
    />
  ),
  play: async ({ canvasElement }) => {
    const card = await openAndGetCard(canvasElement, 'NextTaskModal-realistic-copy')
    await expect(within(document.body).getByText('Maximize your governance influence in the community')).toBeInTheDocument()
    await expect(within(card).getByText('GOVERNANCE VOTE')).toBeInTheDocument()
    await expect(within(document.body).getByText('Decide later during voting window')).toBeInTheDocument()
  },
}
