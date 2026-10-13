import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { ConnectAWalletWidget } from '@goodwidget/connect-a-wallet-widget'
import { getInjectedEip1193Provider } from '../../fixtures/injectedEip1193'

const meta: Meta<typeof ConnectAWalletWidget> = {
  title: 'QA/ConnectAWalletWidget/Interactions',
  component: ConnectAWalletWidget,
  tags: ['qa'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

// Playwright supplies an EIP-1193 provider and intercepts HTTP RPC. The widget,
// adapter, SDK, confirmation dialog and toasts all use their production paths.
export const WalletFlow: Story = {
  render: () => (
    <ConnectAWalletWidget
      provider={getInjectedEip1193Provider()}
      onLinkSuccess={(detail) => window.dispatchEvent(new CustomEvent('caw-link-success', { detail }))}
      onUnlinkSuccess={(detail) => window.dispatchEvent(new CustomEvent('caw-unlink-success', { detail }))}
      onLinkError={(detail) => window.dispatchEvent(new CustomEvent('caw-link-error', { detail }))}
    />
  ),
}

export const NoProvider: Story = {
  render: () => <ConnectAWalletWidget />,
}
