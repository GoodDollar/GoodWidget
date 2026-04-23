/**
 * ButtonPage — demo page for the Button primitive.
 *
 * Route: /components/button
 *
 * Shows the Button component in all its primary variants and sizes so
 * reviewers and Playwright tests can inspect each state in isolation.
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
  XStack,
} from '@goodwidget/ui'

export function ButtonPage() {
  return (
    <MiniAppShell title="Button">
      {/* Primary variants */}
      <Card>
        <Heading level={5}>Variants</Heading>
        <XStack gap="$2" flexWrap="wrap">
          {/* data-testid follows the convention: ComponentName-variant */}
          <Button variant="primary" data-testid="Button-primary">
            <ButtonText>Primary</ButtonText>
          </Button>
          <Button variant="secondary" data-testid="Button-secondary">
            <ButtonText>Secondary</ButtonText>
          </Button>
          <Button variant="ghost" data-testid="Button-ghost">
            <ButtonText>Ghost</ButtonText>
          </Button>
        </XStack>
      </Card>

      {/* Size variants */}
      <Card>
        <Heading level={5}>Sizes</Heading>
        <XStack gap="$2" flexWrap="wrap" alignItems="center">
          <Button size="sm" data-testid="Button-sm">
            <ButtonText>Small</ButtonText>
          </Button>
          <Button size="md" data-testid="Button-md">
            <ButtonText>Medium</ButtonText>
          </Button>
          <Button size="lg" data-testid="Button-lg">
            <ButtonText>Large</ButtonText>
          </Button>
        </XStack>
      </Card>

      {/* Full-width */}
      <Card>
        <Heading level={5}>Full Width</Heading>
        <YStack gap="$2">
          <Button fullWidth data-testid="Button-fullWidth">
            <ButtonText>Full Width Button</ButtonText>
          </Button>
        </YStack>
      </Card>

      {/* Minimal usage code snippet */}
      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { Button, ButtonText } from '@goodwidget/ui'

<Button variant="primary">
  <ButtonText>Click me</ButtonText>
</Button>`}</Text>
      </Card>
    </MiniAppShell>
  )
}
