import React, { useMemo } from 'react'
import { SuperfluidCampaignWidgetWithClient } from '../SuperfluidCampaignWidget'
import type { SuperfluidCampaignWidgetProps } from '../widgetRuntimeContract'
import { MockSuperfluidCampaignDataClient } from './MockSuperfluidCampaignDataClient'
import {
  DEFAULT_MOCK_SUPERFLUID_CAMPAIGN_SCENARIO,
  MOCK_CAMPAIGN_DEFINITION,
  MOCK_LEADERBOARD_SUMMARY,
  type MockLeaderboardScenario,
  type MockProgramSupTotalsScenario,
} from './fixtures'

export interface MockSuperfluidCampaignWidgetProps extends Omit<
  SuperfluidCampaignWidgetProps,
  'data' | 'environment'
> {
  leaderboardScenario?: MockLeaderboardScenario
  programSupTotalsScenario?: MockProgramSupTotalsScenario
}

/** Deterministic Storybook/Playwright entry point. No hook can reach a live endpoint. */
export function MockSuperfluidCampaignWidget({
  leaderboardScenario = DEFAULT_MOCK_SUPERFLUID_CAMPAIGN_SCENARIO.leaderboard,
  programSupTotalsScenario = DEFAULT_MOCK_SUPERFLUID_CAMPAIGN_SCENARIO.programSupTotals,
  ...props
}: MockSuperfluidCampaignWidgetProps) {
  const dataClient = useMemo(
    () =>
      new MockSuperfluidCampaignDataClient({
        leaderboard: leaderboardScenario,
        programSupTotals: programSupTotalsScenario,
      }),
    [leaderboardScenario, programSupTotalsScenario],
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
