import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, within } from '@storybook/test'
import { GoodWidgetProvider } from '@goodwidget/core'
import {
  BottomAppBar, BottomBarItem, EcosystemHeader, Text,
  WidgetDrawer, WidgetListRow, WidgetUnavailable, YStack,
} from '@goodwidget/ui'
import { EcosystemIcon } from './EcosystemIcons'

type PreviewArgs = { theme: 'light' | 'dark' }

const meta: Meta<PreviewArgs> = {
  title: 'Design System/Primitives/Ecosystem Shell Preview',
  tags: ['autodocs', 'showcase', 'ecosystem-shell'],
  parameters: { layout: 'fullscreen' },
  args: { theme: 'light' },
  argTypes: { theme: { control: 'radio', options: ['light', 'dark'] } },
}
export default meta
type Story = StoryObj<PreviewArgs>

const widgets = [
  { label: 'Claim', description: 'Claim your daily G$ UBI' },
  { label: 'Reserve', description: 'Swap through the GoodReserve' },
  { label: 'Streaming', description: 'Streams, pools and balances' },
  { label: 'AI Credits', description: 'Buy AI coding credits with G$' },
] as const

function Preview({ theme }: PreviewArgs) {
  const [connected, setConnected] = useState(false)
  const [selected, setSelected] = useState('Claim')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [supported, setSupported] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [presses, setPresses] = useState(0)

  return (
    <GoodWidgetProvider key={theme} defaultTheme={theme}>
      <YStack width="100%" minHeight={700} backgroundColor="$background" data-testid="shell-preview">
        <EcosystemHeader
          address={connected ? '0x1234567890123456789012345678901234567890' : null}
          chainId={supported ? 42220 : 1}
          onConnect={() => setConnected(true)}
          onWalletAction={() => setConnected(false)}
          walletActionLabel="Disconnect preview wallet"
        />
        <YStack flex={1} width="100%" padding="$4" gap="$4">
          <Text>Component preview only — no wallet or widget is connected.</Text>
          {connected && selected === 'Reserve' && !supported ? (
            <WidgetUnavailable
              widgetName="GoodReserve"
              networkName="Ethereum"
              onSwitchNetwork={() => setSupported(true)}
            />
          ) : connected ? (
            <Text>{selected} widget placeholder</Text>
          ) : (
            <Text>Connect the preview wallet to continue.</Text>
          )}
        </YStack>
        <BottomAppBar>
          {widgets.slice(0, 3).map(({ label }) => (
            <BottomBarItem
              key={label}
              label={label}
              icon={<EcosystemIcon name={label} muted={selected !== label} />}
              active={selected === label}
              onPress={() => setSelected(label)}
            />
          ))}
          <BottomBarItem label="More" icon={<EcosystemIcon name="More" muted />} onPress={() => setDrawerOpen(true)} />
        </BottomAppBar>
        <WidgetDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          {widgets.map(({ label, description }) => (
            <WidgetListRow
              key={label}
              label={label}
              description={description}
              icon={<EcosystemIcon name={label} />}
              active={selected === label}
              onPress={() => { setSelected(label); setDrawerOpen(false) }}
            />
          ))}
        </WidgetDrawer>
      </YStack>
      <YStack width="100%" padding="$4" gap="$4" backgroundColor="$background">
        <Text>Building blocks and states</Text>
        <Text>EcosystemHeader provides the wallet and network controls. BottomAppBar contains BottomBarItem navigation; More opens a WidgetDrawer of WidgetListRow items. WidgetUnavailable explains unsupported networks.</Text>

        <YStack gap="$2" data-testid="header-states">
          <Text>EcosystemHeader: connecting and native wallet</Text>
          <EcosystemHeader onConnect={() => {}} connecting />
          <EcosystemHeader address="0x1234567890123456789012345678901234567890" chainId={42220} />
        </YStack>

        <YStack gap="$2" data-testid="navigation-states">
          <Text>BottomAppBar and BottomBarItem: active, loading and disabled</Text>
          <BottomAppBar>
            <BottomBarItem label="Claim" icon={<EcosystemIcon name="Claim" />} active onPress={() => setPresses((count) => count + 1)} />
            <BottomBarItem label="Loading" icon={<EcosystemIcon name="Streaming" />} loading onPress={() => setPresses((count) => count + 1)} />
            <BottomBarItem label="More" icon={<EcosystemIcon name="More" muted />} disabled onPress={() => setPresses((count) => count + 1)} />
          </BottomAppBar>
          <Text>Pressed {presses}</Text>
        </YStack>

        <YStack gap="$2" data-testid="row-states">
          <Text>WidgetListRow: disabled</Text>
          <WidgetListRow label="Disabled" description="Unavailable" icon={<EcosystemIcon name="Streaming" />} disabled />
        </YStack>

        <YStack gap="$2" data-testid="unavailable-state">
          <Text>WidgetUnavailable: switching</Text>
          <WidgetUnavailable widgetName="Citizen Claim" networkName="Ethereum" switching={switching} onSwitchNetwork={() => setSwitching(true)} />
          {switching && <Text>Switch requested</Text>}
        </YStack>
      </YStack>
    </GoodWidgetProvider>
  )
}

export const BuildingBlocks: Story = {
  render: (args) => <Preview {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const header = within(canvas.getByTestId('header-states'))
    await expect(header.getByRole('button', { name: 'Connect Wallet' })).toBeDisabled()
    await expect(header.getByRole('button', { name: 'Connect Wallet' })).toHaveAttribute('aria-busy', 'true')
    await expect(header.queryByRole('button', { name: 'Wallet options' })).not.toBeInTheDocument()
    const navigation = within(canvas.getByTestId('navigation-states'))
    await expect(navigation.getByRole('button', { name: 'Loading' })).toHaveAttribute('aria-busy', 'true')
    await expect(navigation.getByRole('button', { name: 'More' })).toBeDisabled()
    await expect(within(canvas.getByTestId('row-states')).getByRole('button', { name: 'Disabled' })).toBeDisabled()
  },
}
