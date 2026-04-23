/**
 * GlowCardPage — demo page for the GlowCard composite.
 *
 * Route: /components/glowcard
 */
import React from 'react'
import { MiniAppShell, Card, GlowCard, Heading, Text, YStack } from '@goodwidget/ui'

export function GlowCardPage() {
  return (
    <MiniAppShell title="GlowCard">
      {/* Default glow card with theme-driven glow colour */}
      <GlowCard data-testid="GlowCard-default">
        <Heading level={4}>GlowCard</Heading>
        <Text>
          A Card variant with an animated glow effect driven by the <Text bold>primaryLight</Text>{' '}
          theme token. Used as the container for the ClaimWidget action.
        </Text>
      </GlowCard>

      <Card>
        <Heading level={5}>Usage</Heading>
        <YStack gap="$1">
          <Text variant="caption">{`import { GlowCard } from '@goodwidget/ui'

<GlowCard>
  <Heading level={4}>Title</Heading>
  <Text>Content</Text>
</GlowCard>`}</Text>
        </YStack>
      </Card>
    </MiniAppShell>
  )
}
