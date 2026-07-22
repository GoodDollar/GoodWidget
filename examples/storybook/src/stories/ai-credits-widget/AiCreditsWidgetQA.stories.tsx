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
  InsufficientGBalanceStory,
  PaymentFailedStory,
  BackendUnavailableStory,
  UnsupportedChainStory,
  AppKitConnectWalletStory,
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

export const InsufficientGBalance: Story = {
  render: () => <InsufficientGBalanceStory />,
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
