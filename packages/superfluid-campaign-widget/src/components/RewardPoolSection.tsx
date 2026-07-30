import React from 'react'
import { Heading, ProgressBar, Text, YStack } from '@goodwidget/ui'
import type { CampaignActionMockData, CampaignPoolMockData } from '../widgetRuntimeContract'
import { ActionCard } from './ActionCard'

interface RewardPoolSectionProps {
  pool: CampaignPoolMockData
  onPressActionCta: (action: CampaignActionMockData) => void
}

/**
 * Renders one reward pool: heading, participant count, a green SUP-progress
 * bar, then the pool's ActionCards stacked vertically. The two pools this
 * feeds always stack vertically at every breakpoint — no responsive change
 * needed at this level.
 */
export function RewardPoolSection({ pool, onPressActionCta }: RewardPoolSectionProps) {
  const progressLabel = `${pool.supDistributed.toLocaleString()} / ${pool.supTotal.toLocaleString()} SUP`

  return (
    <YStack gap="$3" width="100%">
      <YStack gap="$1">
        <Heading level={4}>{pool.label}</Heading>
        <Text variant="caption" tone="secondary">
          {pool.participants.toLocaleString()} participants
        </Text>
      </YStack>

      <ProgressBar
        value={pool.supDistributed}
        max={pool.supTotal}
        label={progressLabel}
        variant="success"
        hidePercentageOnMobile
      />

      <YStack gap="$2">
        {pool.actions.map((action) => (
          <ActionCard key={action.activity} action={action} onPressCta={onPressActionCta} />
        ))}
      </YStack>
    </YStack>
  )
}
