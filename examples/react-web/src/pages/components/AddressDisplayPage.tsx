/**
 * AddressDisplayPage — demo page for the AddressDisplay component.
 *
 * Route: /components/addressdisplay
 *
 * Uses the mock EIP-1193 provider so the component renders in a connected state.
 */
import React from 'react'
import { MiniAppShell, Card, Heading, Text, AddressDisplay, Alert, YStack } from '@goodwidget/ui'
import { MOCK_ADDRESS } from '../../mock/mockEip1193'

export function AddressDisplayPage() {
  return (
    <MiniAppShell title="AddressDisplay">
      <Alert
        type="info"
        title="Mock address"
        message={`Displaying demo address: ${MOCK_ADDRESS}`}
      />

      <Card>
        <Heading level={5}>Default (truncated)</Heading>
        <YStack gap="$2">
          <AddressDisplay address={MOCK_ADDRESS} data-testid="AddressDisplay-default" />
        </YStack>
      </Card>

      <Card>
        <Heading level={5}>Full address</Heading>
        <YStack gap="$2">
          <AddressDisplay address={MOCK_ADDRESS} truncate={false} data-testid="AddressDisplay-full" />
        </YStack>
      </Card>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { AddressDisplay } from '@goodwidget/ui'

<AddressDisplay address="0xd8dA6B..." />
<AddressDisplay address="0xd8dA6B..." truncate={false} />`}</Text>
      </Card>
    </MiniAppShell>
  )
}
