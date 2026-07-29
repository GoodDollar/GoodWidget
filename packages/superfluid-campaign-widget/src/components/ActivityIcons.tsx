import React from 'react'
import { Icon, XStack } from '@goodwidget/ui'
import type { IconColor } from '@goodwidget/ui'
import { ACTIVITY_ICON_MAP } from '../widgetRuntimeContract'
import type { ActivityType } from '../widgetRuntimeContract'
import { ACTIVITY_ICON_NAME_FALLBACK } from './activityIconFallback'

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
