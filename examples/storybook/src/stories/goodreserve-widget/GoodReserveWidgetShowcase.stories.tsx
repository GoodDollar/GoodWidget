import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { GoodReserveWidget } from '@goodwidget/goodreserve-widget'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'

const provider = createCustodialEip1193Provider()

// GoodReserveWidget has no `environment` prop anywhere in its source (confirmed via
// grep), so no environment control is offered here — see
// "[BountyPrep] Storybook: missing primitives and design system gaps" for the logged gap.
const meta: Meta<typeof GoodReserveWidget> = {
  title: 'Widgets/GoodReserveWidget/Showcase',
  component: GoodReserveWidget,
  tags: ['integrator', 'manual', 'showcase'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

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

// Injected wallet story — uses the browser's EIP-1193 provider (MetaMask, Rabby, etc).
// Matches the citizen-claim-widget InjectedWallet pattern. NOT for CI.
function InjectedWalletStory() {
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
      <GoodReserveWidget provider={injectedProvider} />
    </div>
  )
}

export const InjectedWallet: Story = {
  render: () => <InjectedWalletStory />,
}

// Live wallet test — uses real MetaMask/wallet extension for end-to-end testing.
// This story requires a browser wallet extension (MetaMask, etc.) to be installed.
// NOT for CI — requires manual testing with real wallet connection.
export const LiveWallet: Story = {
  render: () => {
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
        <GoodReserveWidget provider={walletProvider} />
      </div>
    )
  },
}
