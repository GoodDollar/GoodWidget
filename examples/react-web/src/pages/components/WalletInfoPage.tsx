/**
 * WalletInfoPage — demo page for the WalletInfo component.
 *
 * Route: /components/walletinfo
 *
 * This page uses the mock EIP-1193 provider so WalletInfo renders in a
 * "connected" state with a stable demo address and chain ID.
 * See src/mock/mockEip1193.ts for values.
 */
import React from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import { MiniAppShell, Card, Heading, Text, WalletInfo, Alert, YStack } from '@goodwidget/ui'
import { createMockEip1193Provider, MOCK_ADDRESS, MOCK_CHAIN_ID } from '../../mock/mockEip1193'

// Create once outside the component so it is stable across renders.
const mockProvider = createMockEip1193Provider()

export function WalletInfoPage() {
  return (
    /*
     * Wrap this page in its own GoodWidgetProvider with the mock provider.
     * This is scoped to this route only and does not affect other routes.
     */
    <GoodWidgetProvider provider={mockProvider} defaultTheme="light">
      <WalletInfoPageInner />
    </GoodWidgetProvider>
  )
}

function WalletInfoPageInner() {
  return (
    <MiniAppShell title="WalletInfo">
      <Alert
        type="info"
        title="Mock wallet connected"
        message={`Demo uses a stable mock address: ${MOCK_ADDRESS.slice(0, 8)}… on chain ${MOCK_CHAIN_ID}`}
      />

      {/* WalletInfo reads address/chainId from the nearest GoodWidgetProvider */}
      <YStack gap="$3">
        <Card data-testid="WalletInfo-connected">
          <Heading level={5}>Connected State</Heading>
          {/*
           * WalletInfo is passed address/chainId as props; the parent provider
           * populates those values from the mock EIP-1193 provider.
           * We render it without manual props so it reads from context.
           */}
          <WalletInfo address={MOCK_ADDRESS} chainId={MOCK_CHAIN_ID} />
        </Card>

        <Card>
          <Heading level={5}>Disconnected State</Heading>
          <YStack data-testid="WalletInfo-disconnected">
            <WalletInfo address={null} chainId={null} />
          </YStack>
        </Card>
      </YStack>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { WalletInfo } from '@goodwidget/ui'
import { useWallet } from '@goodwidget/core'

function MyComponent() {
  const { address, chainId } = useWallet()
  return <WalletInfo address={address} chainId={chainId} />
}`}</Text>
      </Card>
    </MiniAppShell>
  )
}
