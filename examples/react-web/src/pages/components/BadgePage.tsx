/**
 * BadgePage — demo page for the Badge primitive.
 *
 * Route: /components/badge
 */
import React from 'react'
import { MiniAppShell, Card, Heading, Text, Badge, BadgeText, XStack } from '@goodwidget/ui'

export function BadgePage() {
  return (
    <MiniAppShell title="Badge">
      <Card>
        <Heading level={5}>Types</Heading>
        <XStack gap="$2" flexWrap="wrap">
          <Badge type="default" data-testid="Badge-default">
            <BadgeText>Default</BadgeText>
          </Badge>
          <Badge type="info" data-testid="Badge-info">
            <BadgeText>Info</BadgeText>
          </Badge>
          <Badge type="success" data-testid="Badge-success">
            <BadgeText>Success</BadgeText>
          </Badge>
          <Badge type="warning" data-testid="Badge-warning">
            <BadgeText>Warning</BadgeText>
          </Badge>
          <Badge type="error" data-testid="Badge-error">
            <BadgeText>Error</BadgeText>
          </Badge>
        </XStack>
      </Card>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { Badge, BadgeText } from '@goodwidget/ui'

<Badge type="info">
  <BadgeText>Info</BadgeText>
</Badge>`}</Text>
      </Card>
    </MiniAppShell>
  )
}
