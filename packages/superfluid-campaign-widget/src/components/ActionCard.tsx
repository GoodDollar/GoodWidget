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
 * At desktop widths, row 1 contains the title/source and row 2 keeps the icon,
 * description, and action footer side by side. At the shared $sm breakpoint
 * (480px and below), the icon joins the title row while row 2 becomes a column:
 * description first, then the unchanged points-pill/button footer. This gives
 * the longest labels enough room instead of clipping them inside the card.
 *
 * The whole card is a click target for the same action as the CTA button
 * (mouse and keyboard), while the CTA button stays visible rather than being
 * hidden behind an invisible overlay. The button's own onPress stops
 * propagation so a direct click on it doesn't also fire the card's handler.
 */
export function ActionCard({ action, onPressCta }: ActionCardProps) {
  const iconSpec = ACTIVITY_ICON_MAP[action.activity]
  const ActivityIconComponent = ACTIVITY_ICON_COMPONENT[action.activity]
  const iconColor = resolveActivityIconColorToken(iconSpec.colorVariant, true)

  const handleCardActivate = () => onPressCta(action)

  return (
    <Card
      flexDirection="column"
      gap="$3"
      $sm={{ gap: '$2', padding: '$3' }}
      onPress={handleCardActivate}
      role="button"
      tabIndex={0}
      cursor="pointer"
      aria-label={`${action.ctaLabel}: ${action.title}`}
      onKeyDown={(e: React.KeyboardEvent) => {
        // Space/Enter activate the card the same way native buttons do, matching
        // the Accordion header's keyboard pattern elsewhere in this package.
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardActivate()
        }
      }}
    >
      {/* On mobile the icon moves beside a dedicated title/source column.
          Keeping the copy in its own flexible column lets long ecosystem
          titles wrap without pushing the icon onto a line by itself. */}
      <XStack gap="$2" alignItems="flex-start">
        <XStack display="none" $sm={{ display: 'flex' }} flexShrink={0}>
          <ActivityIconComponent size={24} color={iconColor} />
        </XStack>
        <YStack gap="$1" flex={1} minWidth={0}>
          <Text fontWeight="700">{action.title}</Text>
          <Text variant="caption" tone="secondary">
            {action.source}
          </Text>
        </YStack>
      </XStack>

      {/* The desktop action row switches to a vertical content/footer flow at
          $sm. Button and badge sizing stay unchanged; only their placement
          changes so neither can be squeezed or clipped by the description. */}
      <XStack
        data-testid={`ActionCard-layout-${action.activity}`}
        gap="$3"
        alignItems="flex-start"
        $sm={{ flexDirection: 'column', alignItems: 'stretch', gap: '$2' }}
      >
        <XStack flexShrink={0} $sm={{ display: 'none' }}>
          <ActivityIconComponent size={24} color={iconColor} />
        </XStack>
        <Text tone="soft" flex={1}>
          {action.description}
        </Text>
        <YStack
          gap="$2"
          alignItems="flex-end"
          flexShrink={0}
          $sm={{ alignItems: 'center', alignSelf: 'stretch' }}
        >
          <Badge type="info">
            <BadgeText>{action.pointsLabel}</BadgeText>
          </Badge>
          <Button
            size="sm"
            {...compactButtonProps}
            $sm={{ width: '100%' }}
            onPress={(e: { stopPropagation: () => void }) => {
              // Card itself is now a click target for the same action (see Card's
              // onPress above) — stop propagation here so this direct button click
              // doesn't also bubble up and fire the card's handler a second time.
              e.stopPropagation()
              handleCardActivate()
            }}
          >
            <ButtonText>{action.ctaLabel}</ButtonText>
          </Button>
        </YStack>
      </XStack>
    </Card>
  )
}
