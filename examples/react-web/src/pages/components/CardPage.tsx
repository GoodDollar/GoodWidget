/**
 * CardPage — demo page for the Card primitive.
 *
 * Route: /components/card
 */
import React from 'react'
import {
  MiniAppShell,
  Card,
  Heading,
  Text,
  Button,
  ButtonText,
  YStack,
} from '@goodwidget/ui'

export function CardPage() {
  return (
    <MiniAppShell title="Card">
      {/* Default card using theme values */}
      <Card data-testid="Card-default">
        <Heading level={5}>Default Card</Heading>
        <Text>
          Uses base theme background, border, and shadow. Override via the Card component sub-theme.
        </Text>
      </Card>

      {/* Card with action */}
      <Card data-testid="Card-withAction">
        <Heading level={5}>Card with Action</Heading>
        <Text secondary>A card composed with a button child.</Text>
        <Button fullWidth>
          <ButtonText>Take Action</ButtonText>
        </Button>
      </Card>

      {/* Inline-styled card (demonstrating the inline override layer) */}
      <Card backgroundColor="#1A1A2E" borderColor="#7B61FF" borderWidth={2} data-testid="Card-inline">
        <Heading level={4} color="#E0E0FF">
          Inline-styled Card
        </Heading>
        <Text color="#B0B0D0">Per-instance styling via inline props (highest specificity).</Text>
      </Card>

      <Card>
        <Heading level={5}>Usage</Heading>
        <YStack gap="$1">
          <Text variant="caption">{`import { Card } from '@goodwidget/ui'

<Card>
  <Heading level={5}>Title</Heading>
  <Text>Content</Text>
</Card>`}</Text>
        </YStack>
      </Card>
    </MiniAppShell>
  )
}
