import React from 'react'
import { Heading, ProgressBar, Text, YStack } from '@goodwidget/ui'
import type { ProgramSupTotalsAdapter } from '../hooks/useProgramSupTotals'
import { useProgramSupTotals } from '../hooks/useProgramSupTotals'
import type { CampaignActionMockData, CampaignPoolMockData } from '../widgetRuntimeContract'
import { ActionCard } from './ActionCard'

interface RewardPoolSectionProps {
  pool: CampaignPoolMockData
  onPressActionCta: (action: CampaignActionMockData) => void
  supTotalsAdapter?: ProgramSupTotalsAdapter
}

/**
 * Renders one reward pool: heading, participant count, a green SUP-progress
 * bar, then the pool's ActionCards stacked vertically. The two pools this
 * feeds always stack vertically at every breakpoint — no responsive change
 * needed at this level.
 */
export function RewardPoolSection({ pool, onPressActionCta, supTotalsAdapter }: RewardPoolSectionProps) {
  // Live on-chain SUP totals for this pool's campaign, when a matching program
  // exists (see useProgramSupTotals). While loading, on request failure, or
  // when no program is registered yet for this campaignId (true today for
  // Ecosystem funding actions/614), fall back to the pool's placeholder
  // figures rather than showing a loading/error state for this small section.
  const supTotals = useProgramSupTotals(pool.campaignId, supTotalsAdapter)
  const supDistributed = supTotals.data?.totalClaimed ?? pool.supDistributed
  const supTotal = supTotals.data?.totalAllocated ?? pool.supTotal

  const progressLabel = `${supDistributed.toLocaleString()} / ${supTotal.toLocaleString()} SUP`

  return (
    <YStack gap="$3" width="100%">
      <YStack gap="$1">
        <Heading level={4}>{pool.label}</Heading>
        <Text variant="caption" tone="secondary">
          {pool.participants.toLocaleString()} participants
        </Text>
      </YStack>

      <ProgressBar
        value={supDistributed}
        max={supTotal}
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
