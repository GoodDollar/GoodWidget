import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import {
  BuyGdWidget,
  type BuyGdWidgetAdapterFactory,
  type BuyGdWidgetAdapterResult,
  type BuyGdWidgetState,
} from '@goodwidget/buy-gd-widget'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import { buyGdWidgetMockStates } from '../../fixtures/buyGdWidgetMock'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'

const provider = createCustodialEip1193Provider()

const meta: Meta<typeof BuyGdWidget> = {
  title: 'QA/BuyGdWidget/Runtime Fixtures',
  component: BuyGdWidget,
  tags: ['autodocs', 'qa'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof meta>

function createAdapterFactory(mockState: Partial<BuyGdWidgetState>): BuyGdWidgetAdapterFactory {
  return () => {
    const state: BuyGdWidgetState = {
      status: 'idle',
      chainId: 42220,
      address: '0x1111111111111111111111111111111111111111',
      hasProvider: true,
      fiatAmount: '100',
      stableMinAmount: '0',
      currency: 'USD',
      error: null,
      txHash: null,
      ...mockState,
    }

    const actions: BuyGdWidgetAdapterResult['actions'] = {
      connect: async () => {},
      openOnramper: () => {},
      setFiatAmount: () => {},
      setStableMinAmount: () => {},
      setCurrency: () => {},
      startBuy: async () => {},
      retry: () => {},
      refresh: async () => {},
    }

    return { state, actions }
  }
}

function renderStory(state: Partial<BuyGdWidgetState>) {
  return <BuyGdWidget provider={provider} adapterFactory={createAdapterFactory(state)} />
}

export const NoWallet: Story = {
  render: () => renderStory(buyGdWidgetMockStates.noWallet),
}

export const Idle: Story = {
  render: () => renderStory(buyGdWidgetMockStates.idle),
}

export const Loading: Story = {
  render: () => renderStory(buyGdWidgetMockStates.loading),
}

export const Onramper: Story = {
  render: () => renderStory(buyGdWidgetMockStates.onramper),
}

export const TransactionPending: Story = {
  render: () => renderStory(buyGdWidgetMockStates.transactionPending),
}

export const Success: Story = {
  render: () => renderStory(buyGdWidgetMockStates.success),
}

export const Error: Story = {
  render: () => renderStory(buyGdWidgetMockStates.error),
}

function InjectedWalletStory() {
  const injectedProvider = getInjectedEip1193Provider()

  if (!isInjectedProviderUsable(injectedProvider)) {
    return (
      <div data-testid="BuyGdWidget-no-wallet" style={{ padding: 16, maxWidth: 420 }}>
        <strong>No injected wallet found</strong>
        <p>Install/enable MetaMask (or another EIP-1193 wallet), then refresh Storybook.</p>
      </div>
    )
  }

  return (
    <div data-testid="BuyGdWidget-injected-wallet" style={{ width: 420 }}>
      <BuyGdWidget provider={injectedProvider} onramperOnlyCryptos="USDC,cUSD" />
    </div>
  )
}

export const InjectedWallet: Story = {
  render: () => <InjectedWalletStory />,
}
