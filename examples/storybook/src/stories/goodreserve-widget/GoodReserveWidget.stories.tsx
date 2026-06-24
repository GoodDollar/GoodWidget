import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { GoodReserveWidget } from '@goodwidget/goodreserve-widget'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import { reserveWidgetMockStates } from '../../fixtures/goodReserveWidgetMock'

const provider = createCustodialEip1193Provider()

const meta: Meta<typeof GoodReserveWidget> = {
  title: 'Widgets/GoodReserveWidget',
  component: GoodReserveWidget,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

// Renders one deterministic reserve state per story for CI-safe widget coverage.
const renderStory = (mockState: Story['args']['mockState'], dataTestId: string) => (
  <div data-testid={dataTestId} style={{ width: 390 }}>
    <GoodReserveWidget provider={provider} mockState={mockState} />
  </div>
)

export const NoProvider: Story = {
  render: () => renderStory(reserveWidgetMockStates.noProvider, 'GoodReserveWidget-no-provider'),
}

export const SdkInitializing: Story = {
  render: () =>
    renderStory(reserveWidgetMockStates.sdkInitializing, 'GoodReserveWidget-sdk-initializing'),
}

export const UnsupportedChain: Story = {
  render: () =>
    renderStory(reserveWidgetMockStates.unsupportedChain, 'GoodReserveWidget-unsupported-chain'),
}

export const IdleBuy: Story = {
  render: () => renderStory(reserveWidgetMockStates.idleBuy, 'GoodReserveWidget-idle-buy'),
}

export const AmountEditing: Story = {
  render: () => renderStory(reserveWidgetMockStates.amountEditing, 'GoodReserveWidget-amount-editing'),
}

export const QuoteLoading: Story = {
  render: () => renderStory(reserveWidgetMockStates.quoteLoading, 'GoodReserveWidget-quote-loading'),
}

export const QuoteReadyBuy: Story = {
  render: () => renderStory(reserveWidgetMockStates.quoteReady, 'GoodReserveWidget-quote-ready-buy'),
}

export const QuoteReadySell: Story = {
  render: () =>
    renderStory(reserveWidgetMockStates.sellQuoteReady, 'GoodReserveWidget-quote-ready-sell'),
}

export const QuoteReadyXdc: Story = {
  render: () =>
    renderStory(reserveWidgetMockStates.xdcQuoteReady, 'GoodReserveWidget-quote-ready-xdc'),
}

export const QuoteError: Story = {
  render: () => renderStory(reserveWidgetMockStates.quoteError, 'GoodReserveWidget-quote-error'),
}

export const InsufficientBalance: Story = {
  render: () =>
    renderStory(reserveWidgetMockStates.insufficientBalance, 'GoodReserveWidget-insufficient-balance'),
}

export const SlippageSelection: Story = {
  render: () =>
    renderStory(reserveWidgetMockStates.slippageSelection, 'GoodReserveWidget-slippage-selection'),
}

export const ConfirmDialog: Story = {
  render: () => renderStory(reserveWidgetMockStates.confirmDialog, 'GoodReserveWidget-confirm-dialog'),
}

export const SwapPending: Story = {
  render: () => renderStory(reserveWidgetMockStates.swapPending, 'GoodReserveWidget-swap-pending'),
}

export const SwapSuccess: Story = {
  render: () => renderStory(reserveWidgetMockStates.swapSuccess, 'GoodReserveWidget-swap-success'),
}

export const SwapError: Story = {
  render: () => renderStory(reserveWidgetMockStates.swapError, 'GoodReserveWidget-swap-error'),
}

// Live adapter (no mockState) so the real amount-input wiring is exercised.
// Used by the Playwright "types into the input" coverage. The SDK is now
// statically imported and reaches the real getReserveStats/getBuyQuote path
// against a connected wallet provider.
export const Interactive: Story = {
  render: () => (
    <div data-testid="GoodReserveWidget-interactive" style={{ width: 390 }}>
      <GoodReserveWidget provider={provider} />
    </div>
  ),
}

// Live wallet test - uses real MetaMask/wallet extension for end-to-end testing.
// This story requires a browser wallet extension (MetaMask, etc.) to be installed.
// NOT for CI - requires manual testing with real wallet connection.
export const LiveWallet: Story = {
  render: () => {
    // Check if window.ethereum exists (MetaMask or other wallet extension)
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      return (
        <div style={{ padding: '20px', maxWidth: '400px' }}>
          <h2>Wallet Required</h2>
          <p>This story requires a browser wallet extension (MetaMask, etc.) to test the live SDK path.</p>
          <p><strong>To test:</strong></p>
          <ol>
            <li>Install MetaMask or another EIP-1193 compatible wallet</li>
            <li>Connect to Celo mainnet or XDC network</li>
            <li>Refresh this page</li>
            <li>The widget will use your real wallet for testing</li>
          </ol>
        </div>
      )
    }

    // Use the real wallet provider
    const walletProvider = (window as any).ethereum

    return (
      <div data-testid="GoodReserveWidget-live-wallet" style={{ width: 390 }}>
        <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
          <strong>⚠️ Live Wallet Test</strong><br />
          Using real wallet: {walletProvider.isMetaMask ? 'MetaMask' : 'Wallet Extension'}<br />
          <small>Test the full swap flow: quote → confirm → execute → success</small>
        </div>
        <GoodReserveWidget provider={walletProvider} />
      </div>
    )
  },
}
