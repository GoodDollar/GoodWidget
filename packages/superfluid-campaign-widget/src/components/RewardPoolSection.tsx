import React from 'react'
import { Heading, ProgressBar, Text, YStack } from '@goodwidget/ui'
import type { Address } from 'viem'
import type { ProgramSupTotalsAdapter } from '../hooks/useProgramSupTotals'
import { useProgramSupTotals } from '../hooks/useProgramSupTotals'
import type { CampaignActionMockData, CampaignPoolMockData } from '../widgetRuntimeContract'
import { ActionCard } from './ActionCard'

interface RewardPoolSectionProps {
  pool: CampaignPoolMockData
  poolAddress?: Address
  onPressActionCta: (action: CampaignActionMockData) => void
  supTotalsAdapter?: ProgramSupTotalsAdapter
}

/**
 * Renders one reward pool: heading, participant count, a green SUP-progress
 * bar, then the pool's ActionCards stacked vertically. The two pools this
 * feeds always stack vertically at every breakpoint — no responsive change
 * needed at this level.
 */
export function RewardPoolSection({
  pool,
  poolAddress,
  onPressActionCta,
  supTotalsAdapter,
}: RewardPoolSectionProps) {
  // Live on-chain SUP totals for this pool's campaign, when a matching program
  // exists (see useProgramSupTotals). While loading, on request failure, or
  // when the integrator has not supplied a pool address, fall back to the
  // pool's placeholder figures rather than making an unresolvable subgraph query.
  const supTotals = useProgramSupTotals(pool.campaignId, poolAddress, 0, supTotalsAdapter)
  const supDistributed = supTotals.data?.totalClaimed ?? 0
  const supTotal = supTotals.data?.totalAllocated ?? 0
  const participants = supTotals.data?.totalMembers ?? 0

  const progressLabel = `${supDistributed.toLocaleString()} / ${supTotal.toLocaleString()} SUP`

  return (
    <YStack gap="$3" width="100%">
      <YStack gap="$1">
        <Heading level={4}>{pool.label}</Heading>
        <Text variant="caption" tone="secondary">
          {participants.toLocaleString()} participants
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
