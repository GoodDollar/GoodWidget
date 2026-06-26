import type { Meta, StoryObj } from '@storybook/react'
import { AiCreditsWidget } from '@goodwidget/ai-credits-widget'
import {
  DisconnectedStory,
  ConnectedEmptyStory,
  QuoteReadyStory,
  QuoteReadyGoodIdStory,
  PaymentPendingStory,
  PaymentConfirmedStory,
  HasCreditsStory,
  UsageEmptyStory,
  UsageActiveStory,
  InsufficientGBalanceStory,
  PaymentFailedStory,
  BackendUnavailableStory,
  UnsupportedChainStory,
} from '../helpers/aiCreditsWidgetStories'

const meta: Meta<typeof AiCreditsWidget> = {
  title: 'QA/AiCreditsWidget/Runtime Fixtures',
  component: AiCreditsWidget,
  tags: ['autodocs', 'qa'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

/** S1: No wallet connected */
export const Disconnected: Story = {
  render: () => <DisconnectedStory />,
}

/** S2: Wallet connected, G$ balance = 0 */
export const ConnectedEmpty: Story = {
  render: () => <ConnectedEmptyStory />,
}

/** S3: G$ balance > 0, amounts set, quote visible */
export const QuoteReady: Story = {
  render: () => <QuoteReadyStory />,
}

/** S3 + GoodID: 20% streaming bonus badge */
export const QuoteReadyGoodId: Story = {
  render: () => <QuoteReadyGoodIdStory />,
}

/** S4: Celo tx submitted, spinner active */
export const PaymentPending: Story = {
  render: () => <PaymentPendingStory />,
}

/** S5: Celo tx mined, settling on Base */
export const PaymentConfirmed: Story = {
  render: () => <PaymentConfirmedStory />,
}

/** S6: Credits landed, setup snippet visible */
export const HasCredits: Story = {
  render: () => <HasCreditsStory />,
}

/** S7: Credits = 0 after prior purchase, upsell shown */
export const UsageEmpty: Story = {
  render: () => <UsageEmptyStory />,
}

/** S8: Credits > 0, usage log visible */
export const UsageActive: Story = {
  render: () => <UsageActiveStory />,
}

/** S9: G$ balance below minimum */
export const InsufficientGBalance: Story = {
  render: () => <InsufficientGBalanceStory />,
}

/** S11: Celo tx reverted */
export const PaymentFailed: Story = {
  render: () => <PaymentFailedStory />,
}

/** S12: Backend unreachable */
export const BackendUnavailable: Story = {
  render: () => <BackendUnavailableStory />,
}

/** S13: Wallet on wrong chain */
export const UnsupportedChain: Story = {
  render: () => <UnsupportedChainStory />,
}
