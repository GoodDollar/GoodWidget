import React from 'react'
import { Icon, XStack } from '@goodwidget/ui'
import type { IconColor, IconName } from '@goodwidget/ui'
import { ACTIVITY_ICON_MAP } from '../widgetRuntimeContract'
import type { ActivityType } from '../widgetRuntimeContract'

/**
 * ACTIVITY_ICON_MAP's iconName values (calendar, person-plus, megaphone, stream,
 * hand-coin) are not present in @goodwidget/ui's Icon SVG registry yet, and this
 * phase must not touch packages/ui. Substitute the closest available registered
 * glyph per activity until those icons are added to the shared registry.
 */
const ACTIVITY_ICON_NAME_FALLBACK: Record<ActivityType, IconName> = {
  'claim-ubi': 'check',
  'invite-users': 'user',
  'flow-state-vote': 'arrow-up',
  'flow-state-funding': 'arrows-left-right',
  'gardens-donation': 'wallet',
  'gardens-funding': 'refresh',
}

interface ActivityIconsProps {
  /** Activities the row's owner has completed — drives the done/not-done glyph state. */
  completedActivities: ActivityType[]
  size?: 'xs' | 'sm'
}

/**
 * Renders the six fixed activity glyphs (order matches ACTIVITY_ICON_MAP)
 * for a leaderboard row, dimming any activity absent from completedActivities.
 * Desktop keeps all six inline; below $gtMd they wrap to a second line
 * within the cell instead of truncating (see LeaderboardRow's cell wrapper).
 */
export function ActivityIcons({ completedActivities, size = 'sm' }: ActivityIconsProps) {
  const completedSet = new Set(completedActivities)

  return (
    <XStack gap="$2" flexWrap="wrap" alignItems="center">
      {Object.values(ACTIVITY_ICON_MAP).map((spec) => {
        const isDone = completedSet.has(spec.activity)
        const color: IconColor = isDone ? (spec.colorVariant === 'green' ? 'success' : 'primary') : 'muted'

        return (
          <XStack
            key={spec.activity}
            opacity={isDone ? 1 : 0.35}
            aria-label={`${spec.label}: ${isDone ? 'done' : 'not done'}`}
          >
            <Icon name={ACTIVITY_ICON_NAME_FALLBACK[spec.activity]} size={size} color={color} />
          </XStack>
        )
      })}
    </XStack>
  )
}
