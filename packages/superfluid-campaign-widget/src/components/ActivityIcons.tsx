import React from 'react'
import { XStack } from '@goodwidget/ui'
import { ACTIVITY_ICON_MAP } from '../widgetRuntimeContract'
import type { ActivityType } from '../widgetRuntimeContract'
import { ACTIVITY_ICON_COMPONENT, resolveActivityIconColorToken } from './activityIconComponents'

interface ActivityIconsProps {
  /** Activities the row's owner has completed — drives the done/not-done glyph state. */
  completedActivities: ActivityType[]
  size?: 'xs' | 'sm'
}

/** Maps the ActivityIcons `size` prop to the pixel size lucide icons expect. */
const ICON_PX: Record<'xs' | 'sm', number> = { xs: 16, sm: 20 }

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
        const ActivityIconComponent = ACTIVITY_ICON_COMPONENT[spec.activity]
        const color = resolveActivityIconColorToken(spec.colorVariant, isDone)

        return (
          <XStack
            key={spec.activity}
            opacity={isDone ? 1 : 0.35}
            aria-label={`${spec.label}: ${isDone ? 'done' : 'not done'}`}
          >
            <ActivityIconComponent size={ICON_PX[size]} color={color} />
          </XStack>
        )
      })}
    </XStack>
  )
}
