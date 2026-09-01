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
  SetupTabStory,
  InsufficientGBalanceStory,
  BuyTabErrorStory,
  PaymentFailedStory,
  BackendUnavailableStory,
  UnsupportedChainStory,
  AppKitConnectWalletStory,
  MultiSignerManageStory,
  WalletControlsStory,
  WalletControlsHiddenStory,
  DeepLinkSignerStory,
  DeepLinkConsentPendingStory,
  MultiSignerHistoryStory,
  GuidanceCardDefaultStory,
  GuidanceCardHowToUseStory,
  GuidanceCardFaqStory,
  DownloadAntSeedStepStory,
  SignerKeyGeneratedStory,
  SetupAuthorizeWalletStory,
  SignerKeyIncompatibleOperatorStory,
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

/** Multi-signer manage tab: signer selector and private-key reveal. */
export const MultiSignerManage: Story = {
  render: () => <MultiSignerManageStory />,
}

/** Header wallet chip opted in, with a host-supplied disconnect. */
export const WalletControls: Story = {
  render: () => <WalletControlsStory />,
}

/** Wallet host default: no address and no disconnect in the header. */
export const WalletControlsHidden: Story = {
  render: () => <WalletControlsHiddenStory />,
}

/** Deep-link partner signer: consent via pre-signed operatorSignature. */
export const DeepLinkSigner: Story = {
  render: () => <DeepLinkSignerStory />,
}

/** Deep-link signer reaching the buy-flow consent gate: signature prefilled, not yet consented. */
export const DeepLinkConsentPending: Story = {
  render: () => <DeepLinkConsentPendingStory />,
}

/** History tab with signer filter dropdown. */
export const MultiSignerHistory: Story = {
  render: () => <MultiSignerHistoryStory />,
}

export const SetupTab: Story = {
  render: () => <SetupTabStory />,
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
    await expect(within(root).getByText(/Back to setup/i)).toBeVisible()
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
    await expect(within(root).getByText(/Back to setup/i)).toBeVisible()
  },
}

/** Setup tab — Download AntSeed step with active "Start ›" link and locked subsequent steps. */
export const DownloadAntSeedStep: Story = {
  render: () => <DownloadAntSeedStepStory />,
}

export const SignerKeyGenerated: Story = {
  render: () => <SignerKeyGeneratedStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText('Signer key', { exact: true }))
    await userEvent.click(canvas.getByRole('button', { name: /generate signer key/i }))
    await expect(canvas.getByText('Private Key — save this securely')).toBeVisible()
  },
}

export const SetupAuthorizeWallet: Story = {
  render: () => <SetupAuthorizeWalletStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText('Authorize Wallet', { exact: true }))
    await expect(
      within(document.body).getByText(
        /GoodDollar needs this one-time authorization to fund and manage your AI credits/i,
      ),
    ).toBeVisible()
    await expect(
      within(document.body).getByRole('button', { name: 'Authorize Wallet' }),
    ).toBeEnabled()
  },
}

export const SignerKeyIncompatibleOperator: Story = {
  render: () => <SignerKeyIncompatibleOperatorStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText('Signer key', { exact: true }))
    await userEvent.click(canvas.getByRole('button', { name: /import signer key/i }))
    // The operator warning is a status of the import itself, so it only appears
    // once a key has actually been imported.
    await expect(canvas.queryByText('Signer key cannot be used')).toBeNull()
    await userEvent.type(canvas.getByPlaceholderText('0x…'), `0x${'1'.repeat(64)}`)
    await userEvent.click(canvas.getByRole('button', { name: /import signer key/i }))
    await expect(canvas.getByText('Signer key cannot be used')).toBeVisible()
  },
}
