import type { MockSuperfluidCampaignDataClient as MockDataClientContract } from '../dataClient'
import {
  createMockCampaignLeaderboardAdapter,
  createMockAirdropStatusAdapter,
  createMockProgramSupTotalsAdapter,
  type MockSuperfluidCampaignScenario,
} from './fixtures'

/** Complete deterministic runtime; it cannot partially fall through to live data. */
export class MockSuperfluidCampaignDataClient implements MockDataClientContract {
  readonly kind = 'mock' as const
  readonly airdropStatus
  readonly leaderboard
  readonly programSupTotals

  constructor(scenario: MockSuperfluidCampaignScenario) {
    this.airdropStatus = createMockAirdropStatusAdapter(scenario.airdropStatus)
    this.leaderboard = createMockCampaignLeaderboardAdapter(scenario.leaderboard)
    this.programSupTotals = createMockProgramSupTotalsAdapter(scenario.programSupTotals)
  }
}
