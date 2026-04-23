/**
 * TextPage — demo page for the Text primitive.
 *
 * Route: /components/text
 */
import React from 'react'
import { MiniAppShell, Card, Heading, Text, YStack } from '@goodwidget/ui'

export function TextPage() {
  return (
    <MiniAppShell title="Text">
      <Card>
        <Heading level={5}>Variants</Heading>
        <YStack gap="$2">
          <Text data-testid="Text-body">Body text — the default variant.</Text>
          <Text variant="label" data-testid="Text-label">
            Label — used for form field labels.
          </Text>
          <Text variant="caption" data-testid="Text-caption">
            Caption — used for code snippets and secondary information.
          </Text>
          <Text secondary data-testid="Text-secondary">
            Secondary — subdued text for descriptions.
          </Text>
          <Text bold data-testid="Text-bold">
            Bold — for emphasis within body copy.
          </Text>
        </YStack>
      </Card>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { Text } from '@goodwidget/ui'

<Text variant="label">Field Label</Text>
<Text secondary>Description copy</Text>`}</Text>
      </Card>
    </MiniAppShell>
  )
}
