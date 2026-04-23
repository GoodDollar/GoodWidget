/**
 * SpinnerPage — demo page for the Spinner primitive.
 *
 * Route: /components/spinner
 */
import React from 'react'
import { MiniAppShell, Card, Heading, Text, Spinner, XStack } from '@goodwidget/ui'

export function SpinnerPage() {
  return (
    <MiniAppShell title="Spinner">
      <Card>
        <Heading level={5}>Sizes</Heading>
        <XStack gap="$4" alignItems="center">
          <Spinner size="sm" data-testid="Spinner-sm" />
          <Spinner size="md" data-testid="Spinner-md" />
          <Spinner size="lg" data-testid="Spinner-lg" />
        </XStack>
      </Card>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { Spinner } from '@goodwidget/ui'

<Spinner size="md" />`}</Text>
      </Card>
    </MiniAppShell>
  )
}
