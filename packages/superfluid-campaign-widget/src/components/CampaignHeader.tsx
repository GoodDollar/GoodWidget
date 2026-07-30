import React from 'react'
import { Badge, BadgeText, Button, ButtonText, Heading, Text, XStack, YStack } from '@goodwidget/ui'
import type { CampaignMockData } from '../widgetRuntimeContract'

/** claim.superfluid.org is the Superfluid-operated claim app — always opened in a new tab, never embedded. */
const SUPERFLUID_CLAIM_APP_URL = 'https://claim.superfluid.org/'

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
        {/* Level 1 dominates the first screen on phone-width viewports, so it steps down
            to the level-3 scale there while staying the largest text on the page. */}
        <Heading level={1} $sm={{ fontSize: '$7', lineHeight: '$7', letterSpacing: '$7' }}>
          {data.title}
        </Heading>
        <Text secondary>{data.description}</Text>
      </YStack>

      <XStack gap="$2" alignItems="center" flexWrap="wrap" justifyContent="space-between">
        <XStack gap="$2" flexWrap="wrap">
          <Badge type="default">
            <BadgeText>{data.supAllocatedLabel}</BadgeText>
          </Badge>
          <Badge type="default">
            <BadgeText>{data.endsLabel}</BadgeText>
          </Badge>
        </XStack>

        {/* Prominent claim CTA, always blue (Button's default 'primary' variant), opens
            the Superfluid-operated claim app in a new tab — never embedded in the widget. */}
        <Button onPress={() => window.open(SUPERFLUID_CLAIM_APP_URL, '_blank', 'noopener,noreferrer')}>
          <ButtonText>Claim SUP rewards</ButtonText>
        </Button>
      </XStack>
    </YStack>
  )
}
