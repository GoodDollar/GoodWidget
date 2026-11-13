import React, { useMemo, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import type { EIP1193Provider } from '@goodwidget/core'
import { EcosystemWidget, type EcosystemWidgetProps } from '@goodwidget/ecosystem-widget'
import { createMockEip1193Provider, MOCK_ADDRESS, MOCK_CHAIN_ID } from '../../fixtures/mockEip1193'
import { reserveWidgetMockStates } from '../../fixtures/goodReserveWidgetMock'

const allWidgets: EcosystemWidgetProps['widgets'] = [
  'citizen-claim', 'goodreserve', 'streaming', 'ai-credits',
]
const fixtureWidgetProps: EcosystemWidgetProps['widgetProps'] = {
  goodreserve: { mockState: reserveWidgetMockStates.idleBuy },
}

const meta: Meta<typeof EcosystemWidget> = {
  title: 'QA/EcosystemWidget/Runtime Fixtures',
  component: EcosystemWidget,
  tags: ['qa', 'ecosystem-qa'],
  parameters: {
    layout: 'padded',
    goodWidgetProvider: { disableProvider: true, useShell: false },
  },
}

export default meta
type Story = StoryObj<typeof meta>

function Fixture({
  widgets = allWidgets,
  nativeMode = false,
  connectedInitially = false,
  chainId = MOCK_CHAIN_ID,
  supportedChains,
  walletAction = 'disconnect',
}: {
  widgets?: EcosystemWidgetProps['widgets']
  nativeMode?: boolean
  connectedInitially?: boolean
  chainId?: number
  supportedChains?: EcosystemWidgetProps['supportedChains']
  walletAction?: 'disconnect' | 'unavailable' | 'network-settings'
}) {
  const [connected, setConnected] = useState(connectedInitially)
  const [connectCount, setConnectCount] = useState(0)
  const [transactionCount, setTransactionCount] = useState(0)
  const [networkSettingsCount, setNetworkSettingsCount] = useState(0)
  const provider = useMemo<EIP1193Provider>(() => {
    const mock = createMockEip1193Provider()
    return {
      on: mock.on,
      removeListener: mock.removeListener,
      request: async (args) => {
        if (/^(eth_sendTransaction|eth_sendRawTransaction|wallet_sendCalls|personal_sign|eth_sign)/.test(args.method)) {
          setTransactionCount((count) => count + 1)
          throw new Error('Transactions and signing are disabled in this fixture')
        }
        if (args.method === 'eth_chainId') return `0x${chainId.toString(16)}`
        return mock.request(args)
      },
    }
  }, [chainId])

  return (
    <div>
      <p>Mock wallet and reserve state; this is not evidence of live service or transaction behavior.</p>
      <output aria-label="Fixture wallet connections">{connectCount}</output>
      <output aria-label="Blocked signing or transaction requests">{transactionCount}</output>
      <output aria-label="Simulated network settings openings">{networkSettingsCount}</output>
      <EcosystemWidget
        widgets={widgets}
        provider={provider}
        nativeMode={nativeMode}
        addressOverride={connected ? MOCK_ADDRESS : null}
        chainIdOverride={connected ? chainId : null}
        connectOverride={async () => {
          setConnectCount((count) => count + 1)
          setConnected(true)
        }}
        disconnectOverride={
          walletAction === 'unavailable' ? undefined : async () => {
            if (walletAction === 'network-settings') {
              setNetworkSettingsCount((count) => count + 1)
            } else {
              setConnected(false)
            }
          }
        }
        disconnectLabel={walletAction === 'network-settings' ? 'Network settings' : undefined}
        disconnectIcon={walletAction === 'network-settings' ? 'settings' : undefined}
        supportedChains={supportedChains}
        widgetProps={fixtureWidgetProps}
      />
    </div>
  )
}

export const ConnectAndSwitch: Story = { render: () => <Fixture /> }

export const ConnectAndSwitchInteraction: Story = {
  render: () => <Fixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /connect wallet/i }))
    await expect(await canvas.findByText(/Citizen Claim v/, {}, { timeout: 20_000 })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: /^Reserve$/ }))
    await expect(await canvas.findByText(/GoodReserve v/, {}, { timeout: 20_000 })).toBeVisible()
    await expect(canvas.getByLabelText('Fixture wallet connections')).toHaveTextContent('1')
    await expect(canvas.getByLabelText('Blocked signing or transaction requests')).toHaveTextContent('0')
  },
}

export const NativeWallet: Story = {
  render: () => <Fixture nativeMode connectedInitially widgets={['goodreserve']} />,
}

export const DisconnectUnavailable: Story = {
  render: () => <Fixture connectedInitially widgets={['goodreserve']} walletAction="unavailable" />,
}

export const NetworkSettingsAction: Story = {
  render: () => <Fixture connectedInitially widgets={['goodreserve']} walletAction="network-settings" />,
}

export const UnsupportedNetwork: Story = {
  render: () => (
    <Fixture connectedInitially widgets={['goodreserve']} supportedChains={{ goodreserve: [50] }} />
  ),
}

export const NoEnabledWidgets: Story = {
  render: () => <Fixture connectedInitially widgets={[]} />,
}
