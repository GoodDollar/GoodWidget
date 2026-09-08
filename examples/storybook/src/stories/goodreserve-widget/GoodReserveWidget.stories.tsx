import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { BRAND_PRESET_OPTIONS, brandPresetOverrides, type BrandPreset } from '../helpers/themeOverridePresets'
import { GoodReserveWidget } from '@goodwidget/goodreserve-widget'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'
import { reserveWidgetMockStates } from '../../fixtures/goodReserveWidgetMock'

const provider = createCustodialEip1193Provider()

interface GoodReserveWidgetStoryArgs {
  defaultTheme: 'light' | 'dark'
  brandPreset: BrandPreset
}

const meta: Meta<GoodReserveWidgetStoryArgs> = {
  title: 'Widgets/GoodReserveWidget',
  component: GoodReserveWidget,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    defaultTheme: { control: 'radio', options: ['dark', 'light'] },
    brandPreset: { control: 'select', options: BRAND_PRESET_OPTIONS },
  },
  args: {
    defaultTheme: 'dark',
    brandPreset: 'None',
  },
}

export default meta
type Story = StoryObj<GoodReserveWidgetStoryArgs>

// Renders one deterministic reserve state per story for CI-safe widget coverage.
const renderStory = (
  mockState: any,
  dataTestId: string,
  defaultTheme?: 'light' | 'dark',
  themeOverrides?: import('@goodwidget/core').GoodWidgetThemeOverrides
) => (
  <GoodReserveWidget provider={provider} mockState={mockState} defaultTheme={defaultTheme} themeOverrides={themeOverrides} />
)

export const NoProvider: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.noProvider, 'GoodReserveWidget-no-provider', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

export const SdkInitializing: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.sdkInitializing, 'GoodReserveWidget-sdk-initializing', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

export const UnsupportedChain: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.unsupportedChain, 'GoodReserveWidget-unsupported-chain', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

export const IdleBuy: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.idleBuy, 'GoodReserveWidget-idle-buy', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

export const AmountEditing: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.amountEditing, 'GoodReserveWidget-amount-editing', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

export const QuoteLoading: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.quoteLoading, 'GoodReserveWidget-quote-loading', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

export const QuoteReadyBuy: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.quoteReady, 'GoodReserveWidget-quote-ready-buy', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

export const QuoteReadyBuyLightTheme: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.quoteReady, 'GoodReserveWidget-quote-ready-buy-light', 'light', brandPresetOverrides(args.brandPreset)),
}

export const QuoteReadySell: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.sellQuoteReady, 'GoodReserveWidget-quote-ready-sell', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

export const QuoteReadyXdc: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.xdcQuoteReady, 'GoodReserveWidget-quote-ready-xdc', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

export const QuoteError: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.quoteError, 'GoodReserveWidget-quote-error', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

// Stale-quote recovery: re-quoting automatically with the notice still visible.
export const QuoteRefreshing: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.quoteRefreshing, 'GoodReserveWidget-quote-refreshing', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

export const InsufficientBalance: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.insufficientBalance, 'GoodReserveWidget-insufficient-balance', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

export const SlippageSelection: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.slippageSelection, 'GoodReserveWidget-slippage-selection', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

export const ConfirmDialog: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.confirmDialog, 'GoodReserveWidget-confirm-dialog', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

export const ApprovalPending: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.approvalPending, 'GoodReserveWidget-approval-pending', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

export const SwapPending: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.swapPending, 'GoodReserveWidget-swap-pending', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

export const SwapSuccess: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.swapSuccess, 'GoodReserveWidget-swap-success', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

export const SwapError: Story = {
  render: (args) => renderStory(reserveWidgetMockStates.swapError, 'GoodReserveWidget-swap-error', args.defaultTheme, brandPresetOverrides(args.brandPreset)),
}

// Live adapter (no mockState) so the real amount-input wiring is exercised.
// Used by the Playwright "types into the input" coverage. The SDK is now
// statically imported and reaches the real getReserveStats/getBuyQuote path
// against a connected wallet provider.
export const Interactive: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <div data-testid="GoodReserveWidget-interactive" style={{ width: 390 }}>
      <GoodReserveWidget provider={provider} defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
    </div>
  ),
}

// Injected wallet story — uses the browser's EIP-1193 provider (MetaMask, Rabby, etc).
// Matches the citizen-claim-widget InjectedWallet pattern. NOT for CI.
function InjectedWalletStory({ defaultTheme, brandPreset }: { defaultTheme?: 'light' | 'dark'; brandPreset?: BrandPreset }) {
  const injectedProvider = getInjectedEip1193Provider()
  const usableProvider = isInjectedProviderUsable(injectedProvider)

  if (!usableProvider) {
    return (
      <div data-testid="GoodReserveWidget-no-wallet" style={{ padding: '20px', maxWidth: '400px' }}>
        <strong>No injected wallet found</strong>
        <p>
          Install/enable MetaMask (or another EIP-1193 wallet) in this browser, then refresh
          Storybook.
        </p>
      </div>
    )
  }

  return (
    <div data-testid="GoodReserveWidget-injected-wallet" style={{ width: 390 }}>
      <GoodReserveWidget provider={injectedProvider} defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
    </div>
  )
}

export const InjectedWallet: Story = {
  render: ({ defaultTheme, brandPreset }) => <InjectedWalletStory defaultTheme={defaultTheme} brandPreset={brandPreset} />,
}

// Live wallet test — uses real MetaMask/wallet extension for end-to-end testing.
// This story requires a browser wallet extension (MetaMask, etc.) to be installed.
// NOT for CI — requires manual testing with real wallet connection.
export const LiveWallet: Story = {
  render: ({ defaultTheme, brandPreset }) => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      return (
        <div style={{ padding: '20px', maxWidth: '400px' }}>
          <h2>Wallet Required</h2>
          <p>
            This story requires a browser wallet extension (MetaMask, etc.) to test the live SDK
            path.
          </p>
          <p>
            <strong>To test:</strong>
          </p>
          <ol>
            <li>Install MetaMask or another EIP-1193 compatible wallet</li>
            <li>Connect to Celo mainnet or XDC network</li>
            <li>Refresh this page</li>
            <li>The widget will use your real wallet for testing</li>
          </ol>
        </div>
      )
    }

    const walletProvider = (window as any).ethereum

    return (
      <div
        data-testid="GoodReserveWidget-live-wallet"
        style={{
          marginLeft: 'auto',
          marginRight: 'auto',
          width: 420,
          minHeight: 600,
          paddingBottom: 40,
        }}
      >
        <div
          style={{
            marginBottom: '10px',
            padding: '10px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
          }}
        >
          <strong>Live Wallet Test</strong>
          <br />
          Using real wallet: {walletProvider.isMetaMask ? 'MetaMask' : 'Wallet Extension'}
          <br />
          <small>Test the full swap flow: quote - confirm - execute - success</small>
        </div>
        <GoodReserveWidget provider={walletProvider} defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
      </div>
    )
  },
}
