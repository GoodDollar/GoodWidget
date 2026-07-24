import React from 'react'
import {
  CONNECT_A_WALLET_CHAINS,
  ConnectAWalletWidget,
  ConnectAWalletWidgetPreview,
  type ConnectAWalletChainId,
  type ConnectAWalletChainLinkState,
  type ConnectAWalletWidgetAdapterActions,
  type ConnectAWalletWidgetAdapterResult,
  type ConnectAWalletWidgetAdapterState,
} from '@goodwidget/connect-a-wallet-widget'
import { MiniAppShell, YStack } from '@goodwidget/ui'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import { getInjectedEip1193Provider, isInjectedProviderUsable } from '../../fixtures/injectedEip1193'

// Fixed demo addresses so QA screenshots and Playwright text assertions never
// depend on a live wallet or network response.
const DEMO_HOST_WALLET_ADDRESS = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
const DEMO_SECONDARY_ADDRESS = '0x1111111111111111111111111111111111111111'

const CHAIN_NAMES: Record<ConnectAWalletChainId, string> = {
  122: 'Fuse',
  42220: 'Celo',
  50: 'XDC',
}

// One row per supported chain, all 'connected' by default — overridden per
// story to exercise the mixed-status / loading / disconnecting cases.
const readyChainLinks: ConnectAWalletChainLinkState[] = CONNECT_A_WALLET_CHAINS.map((chainId) => ({
  chainId,
  chainName: CHAIN_NAMES[chainId],
  status: 'connected',
}))

const checkingChainLinks: ConnectAWalletChainLinkState[] = CONNECT_A_WALLET_CHAINS.map((chainId) => ({
  chainId,
  chainName: CHAIN_NAMES[chainId],
  status: 'checking',
}))

/**
 * Adapter fixture factory. Defaults to a fully connected, ready state so each
 * story only needs to override the handful of fields relevant to the state
 * it demonstrates — mirrors streaming-widget's createAdapter pattern.
 */
function createAdapter(
  stateOverrides: Partial<ConnectAWalletWidgetAdapterState> = {},
  actionOverrides: Partial<ConnectAWalletWidgetAdapterActions> = {},
): ConnectAWalletWidgetAdapterResult {
  const baseState: ConnectAWalletWidgetAdapterState = {
    isWalletConnected: true,
    walletAddress: DEMO_HOST_WALLET_ADDRESS,
    activeChainId: 42220,
    isActiveChainSupported: true,
    status: 'ready',
    error: null,
    secondaryAddressInput: DEMO_SECONDARY_ADDRESS,
    secondaryAddress: DEMO_SECONDARY_ADDRESS,
    chainLinks: readyChainLinks,
  }

  const actions: ConnectAWalletWidgetAdapterActions = {
    connectWallet: async () => {},
    setSecondaryAddressInput: () => {},
    checkSecondaryAddress: async () => {},
    connectChain: async () => {},
    disconnectChain: async () => {},
    ...actionOverrides,
  }

  return {
    state: { ...baseState, ...stateOverrides },
    actions,
  }
}

function StoryShell({ children, dataTestId }: { children: React.ReactNode; dataTestId: string }) {
  return (
    <MiniAppShell>
      <YStack
        data-testid={dataTestId}
        style={{
          width: '100%',
          maxWidth: 400,
          minHeight: '100vh',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </YStack>
    </MiniAppShell>
  )
}

function PreviewStoryShell({
  adapter,
  dataTestId,
}: {
  adapter: ConnectAWalletWidgetAdapterResult
  dataTestId: string
}) {
  return (
    <StoryShell dataTestId={dataTestId}>
      <ConnectAWalletWidgetPreview adapter={adapter} />
    </StoryShell>
  )
}

function ConnectAWalletWidgetStoryShell({ provider, dataTestId }: { provider: unknown; dataTestId: string }) {
  return (
    <StoryShell dataTestId={dataTestId}>
      <ConnectAWalletWidget provider={provider} environment="production" data-testid={dataTestId} />
    </StoryShell>
  )
}

export function InjectedWalletStory() {
  const injectedProvider = getInjectedEip1193Provider()
  const usableProvider = isInjectedProviderUsable(injectedProvider)

  if (!usableProvider) {
    return (
      <PreviewStoryShell
        adapter={createAdapter({
          isWalletConnected: false,
          walletAddress: null,
          activeChainId: null,
          status: 'not_connected',
          secondaryAddressInput: '',
          secondaryAddress: null,
          chainLinks: checkingChainLinks,
        })}
        dataTestId="ConnectAWalletWidget-no-injected-wallet"
      />
    )
  }

  return (
    <ConnectAWalletWidgetStoryShell provider={injectedProvider} dataTestId="ConnectAWalletWidget-injected-wallet" />
  )
}

export function CustodialLocalFixtureStory() {
  try {
    const provider = createCustodialEip1193Provider()
    return (
      <ConnectAWalletWidgetStoryShell provider={provider} dataTestId="ConnectAWalletWidget-custodial-wallet" />
    )
  } catch (error: unknown) {
    return (
      <YStack data-testid="ConnectAWalletWidget-custodial-config-error" style={{ width: 'min(400px, 100vw)' }}>
        <strong>Custodial fixture not configured</strong>
        <span>
          {error instanceof Error ? error.message : 'Set a local private key in custodialEip1193.ts'}
        </span>
      </YStack>
    )
  }
}

export function NotConnectedStory() {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        isWalletConnected: false,
        walletAddress: null,
        activeChainId: null,
        isActiveChainSupported: false,
        status: 'not_connected',
        secondaryAddressInput: '',
        secondaryAddress: null,
        chainLinks: checkingChainLinks,
      })}
      dataTestId="ConnectAWalletWidget-not-connected"
    />
  )
}

export function ConnectingStory() {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        isWalletConnected: false,
        walletAddress: null,
        activeChainId: null,
        isActiveChainSupported: false,
        status: 'connecting',
        secondaryAddressInput: '',
        secondaryAddress: null,
        chainLinks: checkingChainLinks,
      })}
      dataTestId="ConnectAWalletWidget-connecting"
    />
  )
}

export function ConnectedNoInputStory() {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        status: 'connected_no_input',
        secondaryAddressInput: '',
        secondaryAddress: null,
        chainLinks: checkingChainLinks,
      })}
      dataTestId="ConnectAWalletWidget-connected-no-input"
    />
  )
}

export function CheckingAddressStory() {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        status: 'checking_address',
        chainLinks: checkingChainLinks,
      })}
      dataTestId="ConnectAWalletWidget-checking-address"
    />
  )
}

// Proves the "always show Connect or Disconnect, loading indicator while
// pending, never hidden" requirement: one row of each possible per-chain
// status rendered simultaneously.
export function ReadyMixedRowStatusesStory() {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        status: 'ready',
        chainLinks: [
          { chainId: 122, chainName: 'Fuse', status: 'connected' },
          { chainId: 42220, chainName: 'Celo', status: 'connecting' },
          { chainId: 50, chainName: 'XDC', status: 'disconnecting' },
        ],
      })}
      dataTestId="ConnectAWalletWidget-ready-mixed-row-statuses"
    />
  )
}

export function UnsupportedNetworkStory() {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        activeChainId: 1,
        isActiveChainSupported: false,
      })}
      dataTestId="ConnectAWalletWidget-unsupported-network"
    />
  )
}

export function TopLevelErrorWithRetryStory() {
  return (
    <PreviewStoryShell
      adapter={createAdapter({
        status: 'error',
        error: 'Unable to reach the network. Check your connection and try again.',
        chainLinks: checkingChainLinks,
      })}
      dataTestId="ConnectAWalletWidget-top-level-error"
    />
  )
}
