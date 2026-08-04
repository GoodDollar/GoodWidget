import type { CampaignLeaderboardAdapter } from '../hooks/useCampaignLeaderboard'
import type { ProgramSupTotalsAdapter } from '../hooks/useProgramSupTotals'
import { DEFAULT_CAMPAIGN_DEFINITION } from '../campaignDefinition'
import type { CampaignDefinition, LeaderboardSummaryData } from '../widgetRuntimeContract'

export type MockLeaderboardScenario = 'populated' | 'empty' | 'loading' | 'requestFailed'
export type MockProgramSupTotalsScenario = 'populated' | 'noProgram' | 'loading' | 'requestFailed'

export interface MockSuperfluidCampaignScenario {
  leaderboard: MockLeaderboardScenario
  programSupTotals: MockProgramSupTotalsScenario
}

export const DEFAULT_MOCK_SUPERFLUID_CAMPAIGN_SCENARIO: MockSuperfluidCampaignScenario = {
  leaderboard: 'populated',
  programSupTotals: 'populated',
}

export const MOCK_LEADERBOARD_SUMMARY: LeaderboardSummaryData = {
  totalParticipants: 2184,
  supDistributed: 316300,
  supTotal: 622000,
  lastUpdatedLabel: 'Last updated: 18m ago',
}

export const MOCK_CAMPAIGN_DEFINITION: CampaignDefinition = {
  ...DEFAULT_CAMPAIGN_DEFINITION,
  supAllocatedLabel: '622K SUP allocated',
}

/**
 * Fixed campaign-leaderboard pages keyed by campaignId, shaped like the live
 * Superfluid Points API responses — one entry per reward pool so tab switching
 * shows distinct deterministic data.
 */
const LEADERBOARD_DATA_FIXTURES: Record<
  number,
  NonNullable<ReturnType<CampaignLeaderboardAdapter>['data']>
> = {
  606: {
    summary: {
      campaignId: 606,
      name: 'GoodDollar Actions',
      slug: 'good-dollar-actions',
      totalPoints: 128450,
      memberCount: 624,
      totalEvents: 3891,
      lastEventAt: '2026-07-29T18:42:00.000Z',
      createdAt: '2026-01-05T00:00:00.000Z',
    },
    accounts: [
      {
        account: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
        totalPoints: 4820,
        eventCount: 96,
        lastEventAt: '2026-07-29T12:00:00.000Z',
        completedActivities: ['claim-ubi', 'invite-users', 'flow-state-vote'],
      },
      {
        account: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
        totalPoints: 4390,
        eventCount: 88,
        lastEventAt: '2026-07-29T11:00:00.000Z',
        completedActivities: ['claim-ubi', 'invite-users'],
      },
      {
        account: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
        totalPoints: 3910,
        eventCount: 79,
        lastEventAt: '2026-07-29T10:00:00.000Z',
        completedActivities: ['claim-ubi'],
      },
    ],
    pagination: {
      page: 1,
      limit: 10,
      totalDocs: 624,
      totalPages: 63,
      hasNextPage: true,
      hasPrevPage: false,
    },
  },
  614: {
    summary: {
      campaignId: 614,
      name: 'Ecosystem Contributions',
      slug: 'ecosystem-funding-actions',
      totalPoints: 84200,
      memberCount: 318,
      totalEvents: 1745,
      lastEventAt: '2026-07-29T17:10:00.000Z',
      createdAt: '2026-01-05T00:00:00.000Z',
    },
    accounts: [
      {
        account: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e',
        totalPoints: 3420,
        eventCount: 55,
        lastEventAt: '2026-07-29T09:00:00.000Z',
        completedActivities: ['flow-state-funding', 'gardens-donation', 'gardens-funding'],
      },
      {
        account: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f',
        totalPoints: 2985,
        eventCount: 47,
        lastEventAt: '2026-07-29T08:00:00.000Z',
        completedActivities: ['gardens-donation'],
      },
    ],
    pagination: {
      page: 1,
      limit: 10,
      totalDocs: 318,
      totalPages: 32,
      hasNextPage: true,
      hasPrevPage: false,
    },
  },
}

/**
 * Fixed SUP program totals keyed by campaignId. These are illustrative QA
 * values rather than a live snapshot and deliberately stay in the mocked entry.
 */
const SUP_TOTALS_FIXTURES: Record<
  number,
  NonNullable<ReturnType<ProgramSupTotalsAdapter>['data']>
> = {
  606: { totalAllocated: 217700, totalClaimed: 128940, totalMembers: 712 },
  614: { totalAllocated: 404300, totalClaimed: 262450, totalMembers: 318 },
}

/** Named leaderboard scenarios exercised by Storybook and Playwright. */
export function createMockCampaignLeaderboardAdapter(
  scenario: MockLeaderboardScenario,
): CampaignLeaderboardAdapter {
  return (campaignId) => {
    if (scenario === 'loading') return { data: null, isLoading: true, error: null }
    if (scenario === 'requestFailed') {
      return {
        data: null,
        isLoading: false,
        error: 'Campaign leaderboard request failed (500)',
      }
    }
    const fixture = LEADERBOARD_DATA_FIXTURES[campaignId]
    if (!fixture) return { data: null, isLoading: false, error: null }
    if (scenario === 'empty') {
      return {
        data: {
          ...fixture,
          summary: { ...fixture.summary, memberCount: 0, totalPoints: 0, totalEvents: 0 },
          accounts: [],
          pagination: { ...fixture.pagination, totalDocs: 0, totalPages: 0, hasNextPage: false },
        },
        isLoading: false,
        error: null,
      }
    }
    return { data: fixture, isLoading: false, error: null }
  }
}

/** Named SUP-total scenarios exercised by Storybook and Playwright. */
export function createMockProgramSupTotalsAdapter(
  scenario: MockProgramSupTotalsScenario,
): ProgramSupTotalsAdapter {
  return (campaignId) => {
    if (scenario === 'loading') return { data: null, isLoading: true, error: null }
    if (scenario === 'requestFailed') {
      return { data: null, isLoading: false, error: 'SUP program totals request failed (500)' }
    }
    if (scenario === 'noProgram') return { data: null, isLoading: false, error: null }
    return { data: SUP_TOTALS_FIXTURES[campaignId] ?? null, isLoading: false, error: null }
  }
}
