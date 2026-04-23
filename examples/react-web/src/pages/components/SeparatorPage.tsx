/**
 * SeparatorPage — demo page for the Separator primitive.
 *
 * Route: /components/separator
 */
import React from 'react'
import { MiniAppShell, Card, Heading, Text, Separator, YStack } from '@goodwidget/ui'

export function SeparatorPage() {
  return (
    <MiniAppShell title="Separator">
      <Card>
        <Heading level={5}>Horizontal</Heading>
        <YStack gap="$3">
          <Text>Content above separator</Text>
          <Separator data-testid="Separator-horizontal" />
          <Text>Content below separator</Text>
        </YStack>
      </Card>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { Separator } from '@goodwidget/ui'

<Separator />`}</Text>
      </Card>
    </MiniAppShell>
  )
}
