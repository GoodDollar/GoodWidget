import type { GoodWidgetConfig, GoodWidgetThemeOverrides, IconName } from '@goodwidget/ui'
import type {
  CitizenClaimWidgetCustodialExecution,
  CitizenClaimWidgetEnvironment,
} from '@goodwidget/citizen-claim-widget'
import type { Address } from 'viem'

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
  'claim-ubi': {
    activity: 'claim-ubi',
    iconName: 'calendar',
    colorVariant: 'blue',
    label: 'Claim UBI',
  },
  'invite-users': {
    activity: 'invite-users',
    iconName: 'person-plus',
    colorVariant: 'blue',
    label: 'Successful invite',
  },
  'flow-state-vote': {
    activity: 'flow-state-vote',
    iconName: 'megaphone',
    colorVariant: 'blue',
    label: 'Flow State vote',
  },
  'flow-state-funding': {
    activity: 'flow-state-funding',
    iconName: 'stream',
    colorVariant: 'blue',
    label: 'Flow State funding stream',
  },
  'gardens-donation': {
    activity: 'gardens-donation',
    iconName: 'hand-coin',
    colorVariant: 'green',
    label: 'Gardens one-time donation',
  },
  'gardens-funding': {
    activity: 'gardens-funding',
    iconName: 'stream',
    colorVariant: 'green',
    label: 'Gardens funding stream',
  },
}

// ---------------------------------------------------------------------------
// Reward pools — two fixed pools per #127, stacked vertically at every breakpoint.
// ---------------------------------------------------------------------------
export type CampaignPoolId = 'good-dollar-actions' | 'ecosystem-funding-actions'
export type CampaignPoolAddresses = Partial<Record<number, Address>>

/**
 * How an action card's CTA is handled. Claim embeds CitizenClaimWidget;
 * external-link opens the configured destination in a new tab. The invite
 * variant remains for backwards-compatible custom definitions and redirects
 * to GoodWallet rather than embedding the unfinished invite flow.
 */
export type CampaignActionCtaKind = 'claim-widget-claim' | 'claim-widget-invite' | 'external-link'

export interface CampaignActionDefinition {
  activity: ActivityType
  /**
   * Points API event names that prove this activity was completed. When omitted,
   * the canonical ActivityType value is used. For existing producers, provide
   * their actual event name here (for example `claimed` for `claim-ubi`).
   * Aliases let an integrator match an existing event producer without changing
   * the widget's stable activity names or icon mapping.
   */
  pointsEventNames?: string[]
  title: string
  source: string
  description: string
  pointsLabel: string
  ctaLabel: string
  ctaKind: CampaignActionCtaKind
  /** Required when ctaKind is 'external-link'. */
  href?: string
}

export interface CampaignPoolDefinition {
  id: CampaignPoolId
  /** Superfluid Points API campaign id backing this pool's leaderboard tab. */
  campaignId: number
  label: string
  actions: CampaignActionDefinition[]
}

// ---------------------------------------------------------------------------
// Leaderboard — split into always-public rows and a connected-only user row,
// matching the disconnected/connected mockups (the user's row simply doesn't
// exist in the disconnected view rather than being hidden/blurred).
// ---------------------------------------------------------------------------
export interface LeaderboardEntry {
  rank: number
  address: string
  ensName?: string
  points: number
  /** Activities with at least one positive point event for this account. */
  completedActivities: ActivityType[]
}

export interface LeaderboardSummaryData {
  totalParticipants: number
  supDistributed: number
  supTotal: number
  lastUpdatedLabel: string
}

// An answer is either plain text, or an ordered list of blocks — a paragraph
// (its own sequence of text/link segments) or a bullet list (each bullet is
// itself a sequence of segments) — so an answer can combine short paragraphs,
// bullets, and inline external links (e.g. "claim G$ for free") without
// adopting a full rich-text/markdown format for what is otherwise static FAQ copy.
export interface FaqAnswerLinkSegment {
  text: string
  href: string
}

export type FaqAnswerSegment = string | FaqAnswerLinkSegment

export type FaqAnswerParagraphBlock = FaqAnswerSegment[]

export interface FaqAnswerBulletListBlock {
  type: 'bullets'
  items: FaqAnswerSegment[][]
}

export type FaqAnswerBlock = FaqAnswerParagraphBlock | FaqAnswerBulletListBlock

export interface FaqItemDefinition {
  question: string
  answer: string | FaqAnswerBlock[]
}

export interface CampaignDefinition {
  seasonLabel: string
  title: string
  description: string
  /** Optional fixed campaign copy; mock fixtures use this for visual-state coverage. */
  supAllocatedLabel?: string
  endsLabel: string
  pools: CampaignPoolDefinition[]
  faq: FaqItemDefinition[]
}

/**
 * Integrator-specific destinations for action cards. These are applied only to
 * actions that open a link; omitted keys keep the campaign definition's URL.
 */
export type CampaignActionLinkOverrides = Partial<Record<ActivityType, string>>

// ---------------------------------------------------------------------------
// Public component props
// ---------------------------------------------------------------------------
export interface SuperfluidCampaignWidgetProps {
  provider?: unknown
  /** Integrator-owned wallet connect flow, matching AiCreditsWidget. */
  connectOverride?: () => Promise<void>
  /** Integrator-owned wallet disconnect flow. */
  disconnectOverride?: () => Promise<void>
  /**
   * Integrator-owned live address (e.g. from a wallet-connection SDK's own
   * reactive account hook). See `GoodWidgetProviderProps.addressOverride`.
   */
  addressOverride?: string | null
  /**
   * Integrator-owned live chain id, mirroring `addressOverride`. See
   * `GoodWidgetProviderProps.chainIdOverride`.
   */
  chainIdOverride?: number | null
  /**
   * Integrator-owned chain-switch fallback. See
   * `GoodWidgetProviderProps.switchChainOverride`.
   */
  switchChainOverride?: (chainId: number) => Promise<void>
  /**
   * Chain ids the passed-down provider can currently execute on. See
   * `GoodWidgetProviderProps.availableChainIdsOverride`. Claim execution is
   * scoped to this set; balance/entitlement reads are unaffected.
   */
  availableChainIdsOverride?: number[] | null
  /**
   * Label for the wallet chip's disconnect action. See
   * `GoodWidgetProviderProps.disconnectLabel`.
   */
  disconnectLabel?: string
  /**
   * Icon for the wallet chip's disconnect action, mirroring `disconnectLabel`.
   * See `GoodWidgetProviderProps.disconnectIcon`.
   */
  disconnectIcon?: IconName
  environment?: SuperfluidCampaignWidgetEnvironment
  themeOverrides?: GoodWidgetThemeOverrides
  config?: GoodWidgetConfig
  defaultTheme?: 'light' | 'dark'
  /** Optional wider desktop content cap; mobile remains capped at 480px. */
  contentMaxWidth?: number
  /**
   * Overrides the built-in campaign definition. This is stable campaign
   * configuration (copy, actions, identifiers, links and event-name aliases),
   * never changing runtime totals or leaderboard results.
   */
  data?: CampaignDefinition
  /**
   * Replaces the destination of link-based action cards (including the
   * GoodWallet fallback used when the Claim CTA is disabled). Built-in campaign
   * URLs remain the default for every omitted action. The normal Claim CTA still
   * opens the embedded CitizenClaimWidget when claiming is enabled.
   */
  actionLinks?: CampaignActionLinkOverrides
  /** Passed through to the embedded CitizenClaimWidget for the Claim CTA. */
  citizenClaimEnvironment?: CitizenClaimWidgetEnvironment
  /** Optional wallet-owned, chain-specific clients for parallel custodial claims. */
  citizenClaimExecution?: CitizenClaimWidgetCustodialExecution
  /** Redirect the Claim CTA to GoodWallet instead of embedding CitizenClaimWidget. */
  disableClaim?: boolean
  /**
   * View shown on first render. Defaults to 'content'. Lets Storybook fixtures
   * and deep links land directly on the leaderboard without a click.
   */
  initialView?: SuperfluidCampaignView
  /**
   * Public on-chain GDA pool addresses, keyed by Points API campaign id.
   *
   * The widget deliberately does not resolve these through
   * claim.superfluid.org/api/programs because that endpoint is not available
   * to arbitrary browser origins. Integrators may source these values from
   * environment variables and pass them here.
   */
  poolAddresses?: CampaignPoolAddresses
}
