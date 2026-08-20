import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, waitFor, within } from '@storybook/test'
import { AiCreditsWidget } from '@goodwidget/ai-credits-widget'
import {
  DisconnectedStory,
  ConnectingStory,
  PurchaseSetupStory,
  QuoteReadyStory,
  QuoteReadyGoodIdStory,
  PaymentPendingStory,
  PaymentConfirmedStory,
  CreditsManagementStory,
  HistoryTabStory,
  InsufficientGBalanceStory,
  BuyTabErrorStory,
  PaymentFailedStory,
  BackendUnavailableStory,
  UnsupportedChainStory,
  AppKitConnectWalletStory,
  MultiBuyerManageStory,
  DeepLinkBuyerStory,
  DeepLinkConsentPendingStory,
  MultiBuyerHistoryStory,
  GuidanceCardDefaultStory,
  GuidanceCardHowToUseStory,
  GuidanceCardFaqStory,
} from '../helpers/aiCreditsWidgetStories'

const meta: Meta<typeof AiCreditsWidget> = {
  title: 'QA/AiCreditsWidget/Runtime Fixtures',
  component: AiCreditsWidget,
  tags: ['autodocs', 'qa'],
  parameters: {
    layout: 'padded',
    goodWidgetProvider: {
      disableProvider: true,
      useShell: false,
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Disconnected: Story = {
  render: () => <DisconnectedStory />,
}

export const Connecting: Story = {
  render: () => <ConnectingStory />,
}

export const PurchaseSetup: Story = {
  render: () => <PurchaseSetupStory />,
}

export const QuoteReady: Story = {
  render: () => <QuoteReadyStory />,
}

export const QuoteReadyGoodId: Story = {
  render: () => <QuoteReadyGoodIdStory />,
}

export const PaymentPending: Story = {
  render: () => <PaymentPendingStory />,
}

export const PaymentConfirmed: Story = {
  render: () => <PaymentConfirmedStory />,
}

export const CreditsManagement: Story = {
  render: () => <CreditsManagementStory />,
}

export const HistoryTab: Story = {
  render: () => <HistoryTabStory />,
}

export const InsufficientGBalance: Story = {
  render: () => <InsufficientGBalanceStory />,
}

export const BuyTabError: Story = {
  render: () => <BuyTabErrorStory />,
}

export const PaymentFailed: Story = {
  render: () => <PaymentFailedStory />,
}

export const BackendUnavailable: Story = {
  render: () => <BackendUnavailableStory />,
}

export const UnsupportedChain: Story = {
  render: () => <UnsupportedChainStory />,
}

/** Multi-buyer manage tab: buyer selector and private-key reveal. */
export const MultiBuyerManage: Story = {
  render: () => <MultiBuyerManageStory />,
}

/** Deep-link partner buyer: consent via pre-signed operatorSignature. */
export const DeepLinkBuyer: Story = {
  render: () => <DeepLinkBuyerStory />,
}

/** Deep-link buyer reaching the buy-flow consent gate: signature prefilled, not yet consented. */
export const DeepLinkConsentPending: Story = {
  render: () => <DeepLinkConsentPendingStory />,
}

/** History tab with buyer filter dropdown. */
export const MultiBuyerHistory: Story = {
  render: () => <MultiBuyerHistoryStory />,
}

export const AppKitConnectWallet: Story = {
  render: () => <AppKitConnectWalletStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const noConfigFallback = canvas.queryByTestId('AiCreditsWidget-appkit-no-config')
    if (noConfigFallback) {
      await expect(noConfigFallback).toBeVisible()
      return
    }

    const connectRoot = await canvas.findByTestId('AiCreditsWidget-appkit-connect')
    const openModal = document.body.querySelector('w3m-modal.open')
    if (!openModal) {
      const connectButton = within(connectRoot).getByRole('button', { name: /connect wallet/i })
      await userEvent.click(connectButton)
    }

    await waitFor(() => {
      expect(document.body.querySelector('w3m-modal.open')).toBeTruthy()
    })
  },
}

/** Guidance card default state above the buy tab. */
export const GuidanceCardDefault: Story = {
  render: () => <GuidanceCardDefaultStory />,
}

/** Guidance card with How to use view open in buy tab content area. */
export const GuidanceCardHowToUse: Story = {
  render: () => <GuidanceCardHowToUseStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const root = canvas.getByTestId('AiCreditsWidget-guidance-how-to-use')
    const howToUseButton = within(root).getByRole('button', { name: /how to use/i })
    await userEvent.click(howToUseButton)
    await expect(within(root).getByText(/back to buying/i)).toBeVisible()
  },
}

/** Guidance card with FAQ view open in buy tab content area. */
export const GuidanceCardFaq: Story = {
  render: () => <GuidanceCardFaqStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const root = canvas.getByTestId('AiCreditsWidget-guidance-faq')
    const faqButton = within(root).getByRole('button', { name: /faqs/i })
    await userEvent.click(faqButton)
    await expect(within(root).getByText(/back to buying/i)).toBeVisible()
  },
}
