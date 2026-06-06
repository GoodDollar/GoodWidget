import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import {
  GoodReserveWidget,
  __setGoodReserveSdkConstructorForTesting,
} from '@goodwidget/goodreserve-widget'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import { reserveWidgetMockStates } from '../../fixtures/goodReserveWidgetMock'
import {
  FakeGoodReserveSDK,
  createReserveTestProvider,
} from '../../fixtures/goodReserveSdkFake'

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

// ---------------------------------------------------------------------------
// LiveFakeSdk — drives the FULL real adapter against a deterministic fake SDK
// (injected via the test seam) and a local EIP-1193 provider. No mockState, no
// published SDK, no live RPC. Playwright uses this to verify the real
// quote → confirm → buy → success transition (including the submitted tx hash
// from the onHash callback and the PPM exit-contribution scaling).
// ---------------------------------------------------------------------------
const liveProvider = createReserveTestProvider()

// Sets the injected fake synchronously (before the child widget's effects run,
// so bootstrapSdk picks it up) and clears it on unmount, so the fake can never
// leak into other stories rendered later in the same Storybook session.
function LiveFakeSdkHarness() {
  const injected = React.useRef(false)
  if (!injected.current) {
    __setGoodReserveSdkConstructorForTesting(FakeGoodReserveSDK)
    injected.current = true
  }
  React.useEffect(() => {
    return () => __setGoodReserveSdkConstructorForTesting(null)
  }, [])
  return (
    <div data-testid="GoodReserveWidget-live" style={{ width: 390 }}>
      <GoodReserveWidget provider={liveProvider} />
    </div>
  )
}

export const LiveFakeSdk: Story = {
  render: () => <LiveFakeSdkHarness />,
}
