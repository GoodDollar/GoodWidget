import React from 'react'
import { Badge, BadgeText, Button, ButtonText, Card, Text, XStack, YStack } from '@goodwidget/ui'
import { ACTIVITY_ICON_MAP } from '../widgetRuntimeContract'
import type { CampaignActionMockData } from '../widgetRuntimeContract'
import { ACTIVITY_ICON_COMPONENT, resolveActivityIconColorToken } from './activityIconComponents'
import { compactButtonProps } from './shared/styles'

interface ActionCardProps {
  action: CampaignActionMockData
  onPressCta: (action: CampaignActionMockData) => void
}

/**
 * A single reward-pool action row.
 *
 * Two-row column at every breakpoint: row 1 is the title (+ source), on its
 * own flex line so it never reflows when row 2's description wraps. Row 2 is
 * a flex-row of icon, wrappable description, and a final column pairing the
 * points pill above the CTA button. Kept identical at wide and mobile sizing
 * per #127 follow-up — only spacing/padding scale down at $sm, not structure.
 */
export function ActionCard({ action, onPressCta }: ActionCardProps) {
  const iconSpec = ACTIVITY_ICON_MAP[action.activity]
  const ActivityIconComponent = ACTIVITY_ICON_COMPONENT[action.activity]
  const iconColor = resolveActivityIconColorToken(iconSpec.colorVariant, true)

  return (
    <Card flexDirection="column" gap="$3" $sm={{ gap: '$2', padding: '$3' }}>
      {/* Row 1: title + source, isolated in its own flex line so it can't
          reflow or shrink when row 2's description wraps to multiple lines. */}
      <XStack gap="$2" alignItems="center" flexWrap="wrap">
        <Text fontWeight="700">{action.title}</Text>
        <Text variant="caption" tone="secondary">
          {action.source}
        </Text>
      </XStack>

      {/* Row 2: icon <> wrappable copy <> final column (pill above button). */}
      <XStack gap="$3" alignItems="flex-start">
        <XStack flexShrink={0}>
          <ActivityIconComponent size={24} color={iconColor} />
        </XStack>
        <Text tone="soft" flex={1}>
          {action.description}
        </Text>
        <YStack gap="$2" alignItems="flex-end" flexShrink={0}>
          <Badge type="info">
            <BadgeText>{action.pointsLabel}</BadgeText>
          </Badge>
          <Button size="sm" {...compactButtonProps} onPress={() => onPressCta(action)}>
            <ButtonText>{action.ctaLabel}</ButtonText>
          </Button>
        </YStack>
      </XStack>
    </Card>
  )
}
