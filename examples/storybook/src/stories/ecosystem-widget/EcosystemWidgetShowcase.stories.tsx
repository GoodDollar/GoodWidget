import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { EcosystemWidget } from '@goodwidget/ecosystem-widget'
import {
  DefaultAppKitProvider,
  useAppKitSession,
} from '@goodwidget/embed/appkit-provider'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'

const widgets = ['citizen-claim', 'goodreserve', 'streaming', 'ai-credits'] as const
const widgetProps = {
  'ai-credits': {
    backendUrl: import.meta.env.VITE_AI_CREDITS_BACKEND_URL,
    baseRpcUrl: import.meta.env.VITE_AI_CREDITS_BASE_RPC_URL,
    celoRpcUrl: import.meta.env.VITE_AI_CREDITS_CELO_RPC_URL,
  },
}

const meta: Meta<typeof EcosystemWidget> = {
  title: 'Widgets/EcosystemWidget/Showcase',
  component: EcosystemWidget,
  tags: ['integrator', 'manual', 'showcase'],
  parameters: {
    layout: 'padded',
    goodWidgetProvider: { disableProvider: true, useShell: false },
  },
}

export default meta
type Story = StoryObj<typeof meta>

function InjectedWalletShowcase() {
  const provider = getInjectedEip1193Provider()
  if (!isInjectedProviderUsable(provider)) {
    return (
      <div role="status">
        <strong>No injected wallet found</strong>
        <p>Install or enable an EIP-1193 browser wallet, then refresh Storybook.</p>
      </div>
    )
  }
  return (
    <>
      <p>Live wallet showcase. Do not submit transactions during a smoke test.</p>
      <EcosystemWidget widgets={[...widgets]} provider={provider} widgetProps={widgetProps} />
    </>
  )
}

function WalletConnectSession() {
  const session = useAppKitSession()
  return (
    <>
      <p>Live wallet showcase. Do not submit transactions during a smoke test.</p>
      <EcosystemWidget
        widgets={[...widgets]}
        provider={session.provider}
        addressOverride={session.addressOverride}
        chainIdOverride={session.chainIdOverride}
        connectOverride={session.connectOverride}
        disconnectOverride={async () => { await session.open({ view: 'Networks' }) }}
        disconnectLabel="Network settings"
        disconnectIcon="settings"
        switchChainOverride={session.switchChainOverride}
        availableChainIdsOverride={session.availableChainIdsOverride}
        widgetProps={widgetProps}
      />
    </>
  )
}

function WalletConnectShowcase() {
  const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string | undefined
  if (!projectId) {
    return (
      <div role="status">
        <strong>WalletConnect not configured</strong>
        <p>
          Set <code>VITE_REOWN_PROJECT_ID</code> in the Storybook environment to enable AppKit.
        </p>
      </div>
    )
  }
  return (
    <DefaultAppKitProvider
      projectId={projectId}
      metadata={{ name: 'GoodDollar Ecosystem', description: 'GoodDollar ecosystem widgets' }}
    >
      <WalletConnectSession />
    </DefaultAppKitProvider>
  )
}

export const InjectedWallet: Story = { render: () => <InjectedWalletShowcase /> }
export const WalletConnect: Story = { render: () => <WalletConnectShowcase /> }
