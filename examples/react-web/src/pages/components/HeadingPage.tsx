/**
 * HeadingPage — demo page for the Heading primitive.
 *
 * Route: /components/heading
 */
import React from 'react'
import { MiniAppShell, Card, Heading, Text, YStack } from '@goodwidget/ui'

export function HeadingPage() {
  return (
    <MiniAppShell title="Heading">
      <Card>
        <Heading level={5}>All Levels</Heading>
        <YStack gap="$2">
          {([1, 2, 3, 4, 5, 6] as const).map((level) => (
            <Heading key={level} level={level} data-testid={`Heading-h${level}`}>
              Heading level {level}
            </Heading>
          ))}
        </YStack>
      </Card>

      <Card>
        <Heading level={5}>Usage</Heading>
        <Text variant="caption">{`import { Heading } from '@goodwidget/ui'

<Heading level={4}>Section Title</Heading>`}</Text>
      </Card>
    </MiniAppShell>
  )
}
