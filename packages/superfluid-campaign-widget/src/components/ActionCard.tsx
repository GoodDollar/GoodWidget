import React from 'react'
import { Button, ButtonText, Card, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import { ACTIVITY_ICON_MAP } from '../widgetRuntimeContract'
import type { CampaignActionMockData } from '../widgetRuntimeContract'
import { ACTIVITY_ICON_NAME_FALLBACK } from './activityIconFallback'

interface ActionCardProps {
  action: CampaignActionMockData
  onPressCta: (action: CampaignActionMockData) => void
}

/**
 * A single reward-pool action row.
 *
 * Desktop ($gtSm and up): one horizontal row — icon/title/source/description on
 * the left, points-pill + CTA button on the right.
 * Phone (below $gtSm, <480px): the same XStack becomes a YStack — icon+title row,
 * then description, then points-pill+CTA row — same content and order, relayout only.
 */
export function ActionCard({ action, onPressCta }: ActionCardProps) {
  const iconSpec = ACTIVITY_ICON_MAP[action.activity]

  return (
    <Card
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      gap="$3"
      $sm={{ flexDirection: 'column', alignItems: 'stretch' }}
    >
      <XStack gap="$3" alignItems="center" flex={1} $sm={{ flexDirection: 'row' }}>
        <Icon
          name={ACTIVITY_ICON_NAME_FALLBACK[action.activity]}
          size="md"
          color={iconSpec.colorVariant === 'green' ? 'success' : 'primary'}
        />
        <YStack flex={1} gap="$1">
          <XStack gap="$2" alignItems="center" flexWrap="wrap">
            <Text fontWeight="700">{action.title}</Text>
            <Text variant="caption" secondary>
              {action.source}
            </Text>
          </XStack>
          <Text variant="caption" secondary>
            {action.description}
          </Text>
        </YStack>
      </XStack>

      <XStack gap="$3" alignItems="center" $sm={{ justifyContent: 'space-between' }}>
        <Text variant="label" color="$primary">
          {action.pointsLabel}
        </Text>
        <Button size="sm" onPress={() => onPressCta(action)}>
          <ButtonText>{action.ctaLabel}</ButtonText>
        </Button>
      </XStack>
    </Card>
  )
}
