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
  ApiKeyTabActiveStory,
  ApiKeyTabEmptyStory,
  ApiKeyTabComingSoonStory,
  ApiKeyTabErrorStory,
  BuyTabUnavailableStory,
  HistoryTabStory,
  InsufficientGBalanceStory,
  BuyTabErrorStory,
  PaymentFailedStory,
  BackendUnavailableStory,
  UnsupportedChainStory,
  AppKitConnectWalletStory,
  WalletControlsStory,
  WalletControlsHiddenStory,
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

/** API Key tab for an account that already holds a key. */
export const ApiKeyTabActive: Story = {
  render: () => <ApiKeyTabActiveStory />,
}

/** API Key tab before the first purchase. */
export const ApiKeyTabEmpty: Story = {
  render: () => <ApiKeyTabEmptyStory />,
}

/** API Key tab when the host configured no `aiCreditsApi`. */
export const ApiKeyTabComingSoon: Story = {
  render: () => <ApiKeyTabComingSoonStory />,
}

/** API Key tab when the account fails to load. */
export const ApiKeyTabError: Story = {
  render: () => <ApiKeyTabErrorStory />,
}

/** Rotating the key shows the new key once in the "Your API key is ready" sheet. */
export const ApiKeyReadySheet: Story = {
  render: () => <ApiKeyTabActiveStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: 'Rotate' }))
    await userEvent.click(await within(document.body).findByRole('button', { name: 'Rotate key' }))
    // The sheet slides in, so visibility is polled rather than asserted once.
    await waitFor(() =>
      expect(within(document.body).getByText('Your API key is ready')).toBeVisible(),
    )
    await expect(within(document.body).getByRole('button', { name: 'Copy API key' })).toBeVisible()
  },
}

/** Buy tab when the host configured no `aiCreditsApi`: purchases are disabled. */
export const BuyTabUnavailable: Story = {
  render: () => <BuyTabUnavailableStory />,
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

/** Header wallet chip opted in, with a host-supplied disconnect. */
export const WalletControls: Story = {
  render: () => <WalletControlsStory />,
}

/** Wallet host default: no address and no disconnect in the header. */
export const WalletControlsHidden: Story = {
  render: () => <WalletControlsHiddenStory />,
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
    await expect(within(root).getByText(/^back$/i)).toBeVisible()
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
    await expect(within(root).getByText(/^back$/i)).toBeVisible()
  },
}
