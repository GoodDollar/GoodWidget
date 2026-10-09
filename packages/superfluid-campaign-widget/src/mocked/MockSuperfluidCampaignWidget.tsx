import React, { useMemo } from 'react'
import { SuperfluidCampaignWidgetWithClient } from '../SuperfluidCampaignWidget'
import type { SuperfluidCampaignWidgetProps } from '../widgetRuntimeContract'
import { MockSuperfluidCampaignDataClient } from './MockSuperfluidCampaignDataClient'
import {
  DEFAULT_MOCK_SUPERFLUID_CAMPAIGN_SCENARIO,
  MOCK_CAMPAIGN_DEFINITION,
  MOCK_LEADERBOARD_SUMMARY,
  type MockAirdropStatusScenario,
  type MockLeaderboardScenario,
  type MockProgramSupTotalsScenario,
} from './fixtures'

export interface MockSuperfluidCampaignWidgetProps extends Omit<
  SuperfluidCampaignWidgetProps,
  'data' | 'environment'
> {
  airdropStatusScenario?: MockAirdropStatusScenario
  leaderboardScenario?: MockLeaderboardScenario
  programSupTotalsScenario?: MockProgramSupTotalsScenario
}

/** Deterministic Storybook/Playwright entry point. No hook can reach a live endpoint. */
export function MockSuperfluidCampaignWidget({
  airdropStatusScenario = DEFAULT_MOCK_SUPERFLUID_CAMPAIGN_SCENARIO.airdropStatus,
  leaderboardScenario = DEFAULT_MOCK_SUPERFLUID_CAMPAIGN_SCENARIO.leaderboard,
  programSupTotalsScenario = DEFAULT_MOCK_SUPERFLUID_CAMPAIGN_SCENARIO.programSupTotals,
  ...props
}: MockSuperfluidCampaignWidgetProps) {
  const dataClient = useMemo(
    () =>
      new MockSuperfluidCampaignDataClient({
        airdropStatus: airdropStatusScenario,
        leaderboard: leaderboardScenario,
        programSupTotals: programSupTotalsScenario,
      }),
    [airdropStatusScenario, leaderboardScenario, programSupTotalsScenario],
  )

  return (
    <SuperfluidCampaignWidgetWithClient
      {...props}
      data={MOCK_CAMPAIGN_DEFINITION}
      leaderboardSummary={MOCK_LEADERBOARD_SUMMARY}
      dataClient={dataClient}
    />
  )
}
