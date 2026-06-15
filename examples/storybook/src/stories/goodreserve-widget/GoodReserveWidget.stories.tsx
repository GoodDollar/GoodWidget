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
// Used by the Playwright "types into the input" coverage; the SDK is not
// available in CI so this lands in a quote/error state, but the controlled
// input must still accept typed characters.
export const Interactive: Story = {
  render: () => (
    <div data-testid="GoodReserveWidget-interactive" style={{ width: 390 }}>
      <GoodReserveWidget provider={provider} />
    </div>
  ),
}
