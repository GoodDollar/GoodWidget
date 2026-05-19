import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { StreamingWidget } from '@goodwidget/streaming-widget'
import { YStack } from '@goodwidget/ui'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'

// ---------------------------------------------------------------------------
// Story shell — renders the widget inside a fixed-width container that mirrors
// the GoodWalletV2 sidebar / bottom-sheet form factor.
// ---------------------------------------------------------------------------
function StreamingWidgetStoryShell({
  provider,
  dataTestId,
}: {
  provider: unknown
  dataTestId: string
}) {
  return (
    <YStack data-testid={dataTestId} style={{ width: 400, minHeight: '100vh' }}>
      <StreamingWidget provider={provider} environment="development" />
    </YStack>
  )
}

const meta: Meta<typeof StreamingWidget> = {
  title: 'Widgets/StreamingWidget',
  component: StreamingWidget,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------
// Injected wallet story — uses window.ethereum if present in the browser
// ---------------------------------------------------------------------------
function InjectedWalletStory() {
  const injectedProvider = getInjectedEip1193Provider()
  const usableProvider = isInjectedProviderUsable(injectedProvider)

  if (!usableProvider) {
    return (
      <YStack data-testid="StreamingWidget-no-wallet" style={{ width: 400 }} gap="$3">
        <strong>No injected wallet found</strong>
        <span>
          Install/enable MetaMask (or another EIP-1193 wallet) in this browser, then refresh
          Storybook. The widget supports Celo (G$) and Base (SUP).
        </span>
      </YStack>
    )
  }

  return (
    <StreamingWidgetStoryShell
      provider={injectedProvider}
      dataTestId="StreamingWidget-injected-wallet"
    />
  )
}

// ---------------------------------------------------------------------------
// Custodial fixture story — uses the pre-configured test wallet from the fixture
// ---------------------------------------------------------------------------
function CustodialLocalFixtureStory() {
  try {
    const provider = createCustodialEip1193Provider()
    return (
      <StreamingWidgetStoryShell
        provider={provider}
        dataTestId="StreamingWidget-custodial-wallet"
      />
    )
  } catch (error: unknown) {
    return (
      <YStack data-testid="StreamingWidget-custodial-config-error" style={{ width: 400 }}>
        <strong>Custodial fixture not configured</strong>
        <span>
          {error instanceof Error
            ? error.message
            : 'Set a local private key in custodialEip1193.ts'}
        </span>
      </YStack>
    )
  }
}

// ---------------------------------------------------------------------------
// No-wallet story — demonstrates the connect-prompt state
// ---------------------------------------------------------------------------
function NoWalletStory() {
  return (
    <StreamingWidgetStoryShell
      provider={undefined}
      dataTestId="StreamingWidget-no-provider"
    />
  )
}

// ---------------------------------------------------------------------------
// Story exports
// ---------------------------------------------------------------------------

/** Uses window.ethereum if available — shows the full connected experience. */
export const InjectedWallet: Story = {
  render: () => <InjectedWalletStory />,
}

/**
 * Uses a pre-configured custodial test wallet backed by a local private key.
 * Starts on Celo (chain 42220) and uses the development environment.
 * The test key has no on-chain streaming history, so streams/pools lists will be empty.
 */
export const CustodialLocalFixture: Story = {
  render: () => <CustodialLocalFixtureStory />,
}

/** No provider — shows the wallet-connection prompt for both Streams and Pools tabs. */
export const NoWallet: Story = {
  render: () => <NoWalletStory />,
}
