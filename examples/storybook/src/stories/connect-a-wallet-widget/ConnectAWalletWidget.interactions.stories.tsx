import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { GoodWidgetProvider, type EIP1193Provider } from '@goodwidget/core'
import { ConnectAWalletWidget, ConnectAWalletWidgetPreview, useConnectAWalletAdapter } from '@goodwidget/connect-a-wallet-widget'
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

function ReplacementHarness() {
  const [generation, setGeneration] = useState(0)
  return <>
    <button onClick={() => setGeneration((value) => value + 1)}>Replace widget</button>
    <ConnectAWalletWidget key={generation} provider={getInjectedEip1193Provider()} />
  </>
}

export const Replacement: Story = {
  render: () => <ReplacementHarness />,
}

function HostAdapter() {
  const adapter = useConnectAWalletAdapter()
  return <ConnectAWalletWidgetPreview adapter={adapter} />
}

function HostConnectHarness({ reject = false }: { reject?: boolean }) {
  const [provider, setProvider] = useState<EIP1193Provider>()
  const [selecting, setSelecting] = useState(false)
  return <GoodWidgetProvider provider={provider} connectOverride={async () => {
    if (reject) throw new Error('User rejected request')
    setSelecting(true)
  }}>
    {selecting && <div role="dialog" aria-label="Host wallet selector">
      <button onClick={async () => {
        const selected = getInjectedEip1193Provider()
        if (!selected) return
        await selected.request({ method: 'eth_requestAccounts' })
        setProvider(selected)
        setSelecting(false)
      }}>Select wallet</button>
      <button onClick={() => setSelecting(false)}>Cancel wallet selection</button>
    </div>}
    <HostAdapter />
  </GoodWidgetProvider>
}

export const HostConnect: Story = {
  render: () => <HostConnectHarness />,
}

export const HostConnectRejected: Story = {
  render: () => <HostConnectHarness reject />,
}
