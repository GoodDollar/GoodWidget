import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { GoodWidgetProvider } from '@goodwidget/core'
import {
  BottomAppBar, BottomBarItem, EcosystemHeader, Text,
  WidgetDrawer, WidgetListRow, WidgetUnavailable, YStack,
} from '@goodwidget/ui'
import { EcosystemIcon } from './EcosystemIcons'

const meta: Meta = {
  title: 'Design System/Primitives/Ecosystem Shell Preview',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

const widgets = [
  { label: 'Claim', description: 'Claim your daily G$ UBI' },
  { label: 'Reserve', description: 'Swap through the GoodReserve' },
  { label: 'Streaming', description: 'Streams, pools and balances' },
  { label: 'AI Credits', description: 'Buy AI coding credits with G$' },
] as const

function Preview({ theme }: { theme: 'light' | 'dark' }) {
  const [connected, setConnected] = useState(false)
  const [selected, setSelected] = useState('Claim')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [supported, setSupported] = useState(false)

  return (
    <GoodWidgetProvider defaultTheme={theme}>
      <YStack width="100%" minHeight={700} backgroundColor="$background">
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
    </GoodWidgetProvider>
  )
}

export const Light: Story = { render: () => <Preview theme="light" /> }
export const Dark: Story = { render: () => <Preview theme="dark" /> }
export const NavigationStates: Story = {
  render: () => (
    <GoodWidgetProvider defaultTheme="light">
      <BottomAppBar>
        <BottomBarItem label="Claim" icon={<EcosystemIcon name="Claim" />} active />
        <BottomBarItem label="Loading" icon={<EcosystemIcon name="Streaming" />} loading />
        <BottomBarItem label="More" icon={<EcosystemIcon name="More" muted />} disabled />
      </BottomAppBar>
    </GoodWidgetProvider>
  ),
}
