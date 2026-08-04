import type { MockSuperfluidCampaignDataClient as MockDataClientContract } from '../dataClient'
import {
  createMockCampaignLeaderboardAdapter,
  createMockProgramSupTotalsAdapter,
  type MockSuperfluidCampaignScenario,
} from './fixtures'

/** Complete deterministic runtime; it cannot partially fall through to live data. */
export class MockSuperfluidCampaignDataClient implements MockDataClientContract {
  readonly kind = 'mock' as const
  readonly leaderboard
  readonly programSupTotals

  constructor(scenario: MockSuperfluidCampaignScenario) {
    this.leaderboard = createMockCampaignLeaderboardAdapter(scenario.leaderboard)
    this.programSupTotals = createMockProgramSupTotalsAdapter(scenario.programSupTotals)
  }
}
