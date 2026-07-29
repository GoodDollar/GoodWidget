import React from 'react'
import { Badge, BadgeText, Heading, Text, XStack, YStack } from '@goodwidget/ui'
import type { CampaignMockData } from '../widgetRuntimeContract'

interface CampaignHeaderProps {
  data: Pick<CampaignMockData, 'seasonLabel' | 'title' | 'description' | 'supAllocatedLabel' | 'endsLabel'>
}

/**
 * Top-of-page header: "Superfluid" wordmark + season badge, decorative wave
 * art, title, description, and the two info pills. The wave art is purely
 * decorative — it is de-emphasized (not removed) below $gtSm so it doesn't
 * compete with the title/description/pills, which stay full width and first
 * in reading order at every breakpoint.
 */
export function CampaignHeader({ data }: CampaignHeaderProps) {
  return (
    <YStack gap="$4" width="100%">
      <XStack justifyContent="space-between" alignItems="flex-start" width="100%">
        <XStack gap="$2" alignItems="center">
          <Heading level={5}>Superfluid</Heading>
          <Badge type="info">
            <BadgeText>{data.seasonLabel}</BadgeText>
          </Badge>
        </XStack>

        {/* Decorative wave art — non-interactive, safe to fully hide from a11y tree. */}
        <XStack
          width={120}
          height={48}
          borderRadius="$3"
          backgroundColor="$primary"
          opacity={0.4}
          $gtSm={{ opacity: 1 }}
          aria-hidden
        />
      </XStack>

      <YStack gap="$2">
        <Heading level={1}>{data.title}</Heading>
        <Text secondary>{data.description}</Text>
      </YStack>

      <XStack gap="$2" flexWrap="wrap">
        <Badge type="default">
          <BadgeText>{data.supAllocatedLabel}</BadgeText>
        </Badge>
        <Badge type="default">
          <BadgeText>{data.endsLabel}</BadgeText>
        </Badge>
      </XStack>
    </YStack>
  )
}
