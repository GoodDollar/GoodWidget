/**
 * ChainBadgePage — demo page for the ChainBadge component.
 *
 * Route: /components/chainbadge
 *
 * Uses the mock chain ID so the badge renders in a connected/known state.
 */
import React from 'react'
import { MiniAppShell, Card, Heading, Text, ChainBadge, Alert, XStack } from '@goodwidget/ui'
import { MOCK_CHAIN_ID } from '../../mock/mockEip1193'

export function ChainBadgePage() {
  return (
    <MiniAppShell title="ChainBadge">
      <Alert
        type="info"
        title="Mock chain"
        message={`Displaying chain ID: ${MOCK_CHAIN_ID} (Celo mainnet)`}
      />

      <Card>
        <Heading level={5}>Known Chains</Heading>
        <XStack gap="$2" flexWrap="wrap">
          {/* Celo mainnet */}
          <ChainBadge chainId={42220} data-testid="ChainBadge-celo" />
          {/* Ethereum mainnet */}
          <ChainBadge chainId={1} data-testid="ChainBadge-eth" />
          {/* Unknown chain */}
          <ChainBadge chainId={99999} data-testid="ChainBadge-unknown" />
        </XStack>
      </Card>

      <Card>
        <Heading level={5}>Demo (mock) chain</Heading>
        <ChainBadge chainId={MOCK_CHAIN_ID} data-testid="ChainBadge-mock" />
      </Card>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { ChainBadge } from '@goodwidget/ui'

<ChainBadge chainId={42220} />`}</Text>
      </Card>
    </MiniAppShell>
  )
}
