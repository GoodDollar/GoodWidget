import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/ui'
import type { CitizenClaimWidgetEnvironment } from '@goodwidget/citizen-claim-widget'
import type { AirdropStatusAdapter } from './hooks/useAirdropStatus'
import type { CampaignLeaderboardAdapter } from './hooks/useCampaignLeaderboard'

// ---------------------------------------------------------------------------
// Environment type, matching the other GoodWidget packages
// ---------------------------------------------------------------------------
export type SuperfluidCampaignWidgetEnvironment = 'production' | 'staging' | 'development'

// ---------------------------------------------------------------------------
// The two top-level views: the campaign content page, and the full leaderboard.
// Mirrors the two approved desktop mockups (#127).
// ---------------------------------------------------------------------------
export type SuperfluidCampaignView = 'content' | 'leaderboard'

// ---------------------------------------------------------------------------
// The six eligible activity types (#127 "Activity icons" section).
// Exact icon glyph/color mapping is fixed by the approved spec, not themeable.
// ---------------------------------------------------------------------------
export type ActivityType =
  | 'claim-ubi'
  | 'invite-users'
  | 'flow-state-vote'
  | 'flow-state-funding'
  | 'gardens-donation'
  | 'gardens-funding'

export type ActivityIconColorVariant = 'blue' | 'green'

export interface ActivityIconSpec {
  activity: ActivityType
  /** Icon glyph name, resolved against @goodwidget/ui's Icon registry. */
  iconName: string
  colorVariant: ActivityIconColorVariant
  /** Accessible label, also used as a tooltip on the done/not-done glyph. */
  label: string
}

/** Exact mapping from the approved spec in #127 — do not derive from mockup pixels. */
export const ACTIVITY_ICON_MAP: Record<ActivityType, ActivityIconSpec> = {
  'claim-ubi': { activity: 'claim-ubi', iconName: 'calendar', colorVariant: 'blue', label: 'Claim UBI' },
  'invite-users': { activity: 'invite-users', iconName: 'person-plus', colorVariant: 'blue', label: 'Successful invite' },
  'flow-state-vote': { activity: 'flow-state-vote', iconName: 'megaphone', colorVariant: 'blue', label: 'Flow State vote' },
  'flow-state-funding': { activity: 'flow-state-funding', iconName: 'stream', colorVariant: 'blue', label: 'Flow State funding stream' },
  'gardens-donation': { activity: 'gardens-donation', iconName: 'hand-coin', colorVariant: 'green', label: 'Gardens one-time donation' },
  'gardens-funding': { activity: 'gardens-funding', iconName: 'stream', colorVariant: 'green', label: 'Gardens funding stream' },
}

// ---------------------------------------------------------------------------
// Reward pools — two fixed pools per #127, stacked vertically at every breakpoint.
// ---------------------------------------------------------------------------
export type CampaignPoolId = 'good-dollar-actions' | 'ecosystem-funding-actions'

/**
 * How an action card's CTA is handled. The claim-widget variants embed
 * CitizenClaimWidget with initialTab set; external-link opens the Flow
 * State / Gardens URL from #127 in a new tab.
 */
export type CampaignActionCtaKind = 'claim-widget-claim' | 'claim-widget-invite' | 'external-link'

export interface CampaignActionMockData {
  activity: ActivityType
  title: string
  source: string
  description: string
  pointsLabel: string
  ctaLabel: string
  ctaKind: CampaignActionCtaKind
  /** Required when ctaKind is 'external-link'. */
  href?: string
}

export interface CampaignPoolMockData {
  id: CampaignPoolId
  /** Superfluid Points API campaign id backing this pool's leaderboard tab. */
  campaignId: number
  label: string
  supDistributed: number
  supTotal: number
  participants: number
  actions: CampaignActionMockData[]
}

// ---------------------------------------------------------------------------
// Leaderboard — split into always-public rows and a connected-only user row,
// matching the disconnected/connected mockups (the user's row simply doesn't
// exist in the disconnected view rather than being hidden/blurred).
// ---------------------------------------------------------------------------
export interface LeaderboardEntryMockData {
  rank: number
  address: string
  ensName?: string
  points: number
  /** Omitted for rows sourced from the live Points API, which has no per-activity
   *  breakdown — the activity-icons column is hidden entirely for those rows
   *  rather than rendering misleading all-dimmed icons. */
  completedActivities?: ActivityType[]
}

export interface LeaderboardMockData {
  totalParticipants: number
  supDistributed: number
  supTotal: number
  lastUpdatedLabel: string
}

export interface FaqItemMockData {
  question: string
  answer: string
}

export interface CampaignMockData {
  seasonLabel: string
  title: string
  description: string
  supAllocatedLabel: string
  endsLabel: string
  pools: CampaignPoolMockData[]
  leaderboard: LeaderboardMockData
  faq: FaqItemMockData[]
}

// ---------------------------------------------------------------------------
// Public component props
// ---------------------------------------------------------------------------
export interface SuperfluidCampaignWidgetProps {
  provider?: unknown
  environment?: SuperfluidCampaignWidgetEnvironment
  themeOverrides?: GoodWidgetThemeOverrides
  config?: GoodWidgetConfig
  defaultTheme?: 'light' | 'dark'
  /**
   * Overrides the built-in mock dataset (DEFAULT_CAMPAIGN_MOCK_DATA). Lets
   * Storybook fixtures and tests substitute data without touching component
   * internals. Real points/leaderboard data is out of scope for this phase.
   */
  data?: CampaignMockData
  /** Passed through to the embedded CitizenClaimWidget for Claim/Invite CTAs. */
  citizenClaimEnvironment?: CitizenClaimWidgetEnvironment
  /**
   * View shown on first render. Defaults to 'content'. Lets Storybook fixtures
   * and deep links land directly on the leaderboard without a click.
   */
  initialView?: SuperfluidCampaignView
  /**
   * Overrides the live airdrop-status fetch (superfluid-airdrop.goodworker.workers.dev)
   * with a fixed result, the same DI seam AiCreditsWidget's adapterFactory uses.
   * Lets Storybook fixtures and Playwright specs render every airdrop-status
   * state deterministically instead of depending on a real wallet's live
   * whitelist status.
   */
  airdropStatusAdapter?: AirdropStatusAdapter
  /**
   * Overrides the live Superfluid Points API fetch (cms.superfluid.pro/points)
   * with a fixed result per campaignId, the same DI seam airdropStatusAdapter
   * uses. Lets Storybook fixtures and Playwright specs render every
   * leaderboard state deterministically instead of depending on live standings.
   */
  leaderboardAdapter?: CampaignLeaderboardAdapter
}
