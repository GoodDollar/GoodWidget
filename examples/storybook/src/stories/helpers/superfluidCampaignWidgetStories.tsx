import React from 'react'
import {
  SuperfluidCampaignWidget,
  type AirdropStatusAdapter,
  type CampaignLeaderboardAdapter,
  type ProgramSupTotalsAdapter,
  type SuperfluidCampaignWidgetProps,
  type SuperfluidCampaignView,
} from '@goodwidget/superfluid-campaign-widget'
import { MiniAppShell, YStack, type GoodWidgetThemeOverrides } from '@goodwidget/ui'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import { getInjectedEip1193Provider, isInjectedProviderUsable } from '../../fixtures/injectedEip1193'

/**
 * Every real airdrop-status response sampled against the live endpoint so far
 * came back "not whitelisted" (see useAirdropStatus.ts) — that shape is the
 * only one used as a QA/Playwright default. The loading/error/eligible
 * variants below are illustrative fixtures for exercising those UI states,
 * not observed live responses.
 */
const AIRDROP_STATUS_FIXTURES = {
  loading: (): ReturnType<AirdropStatusAdapter> => ({ status: null, isLoading: true, error: null }),
  requestFailed: (): ReturnType<AirdropStatusAdapter> => ({
    status: null,
    isLoading: false,
    error: 'Airdrop status request failed (500)',
  }),
  notWhitelisted: (): ReturnType<AirdropStatusAdapter> => ({
    status: { error: 'not whitelisted', walletData: { claims: '0', invites: '1000' } },
    isLoading: false,
    error: null,
  }),
  eligible: (): ReturnType<AirdropStatusAdapter> => ({
    status: { walletData: { claims: '3', invites: '1000' } },
    isLoading: false,
    error: null,
  }),
} as const

function fixedAirdropStatusAdapter(scenario: keyof typeof AIRDROP_STATUS_FIXTURES): AirdropStatusAdapter {
  return () => AIRDROP_STATUS_FIXTURES[scenario]()
}

/**
 * Fixed campaign-leaderboard pages keyed by campaignId, shaped exactly like the
 * live Superfluid Points API (cms.superfluid.pro/points) responses confirmed in
 * change-request-3 — one entry per #127 reward pool (606 = GoodDollar actions,
 * 614 = Ecosystem actions) so tab-switching shows distinct data.
 */
const LEADERBOARD_DATA_FIXTURES: Record<number, ReturnType<CampaignLeaderboardAdapter>['data']> = {
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
    pagination: { page: 1, limit: 10, totalDocs: 624, totalPages: 63, hasNextPage: true, hasPrevPage: false },
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
    pagination: { page: 1, limit: 10, totalDocs: 318, totalPages: 32, hasNextPage: true, hasPrevPage: false },
  },
}

/** Named leaderboard scenarios exercised by the QA stories/Playwright spec below. */
function fixedCampaignLeaderboardAdapter(
  scenario: 'populated' | 'loading' | 'requestFailed',
): CampaignLeaderboardAdapter {
  return (campaignId) => {
    if (scenario === 'loading') return { data: null, isLoading: true, error: null }
    if (scenario === 'requestFailed') {
      return { data: null, isLoading: false, error: 'Campaign leaderboard request failed (500)' }
    }
    return { data: LEADERBOARD_DATA_FIXTURES[campaignId] ?? null, isLoading: false, error: null }
  }
}

/**
 * Fixed SUP program totals keyed by campaignId. 606 (GoodDollar actions) uses
 * illustrative "healthy progress" data (totalClaimed ≈ 59 % of totalAllocated,
 * not a live snapshot). 614 (Ecosystem funding actions) uses deterministic
 * fixture values so both pools are fully covered in QA stories.
 */
const SUP_TOTALS_FIXTURES: Record<number, ReturnType<ProgramSupTotalsAdapter>['data']> = {
  606: { totalAllocated: 217700, totalClaimed: 128940, totalMembers: 712 },
  614: { totalAllocated: 404300, totalClaimed: 262450, totalMembers: 318 },
}

/** Named SUP-totals scenarios exercised by the QA stories/Playwright spec below. */
function fixedProgramSupTotalsAdapter(scenario: 'populated' | 'loading' | 'requestFailed'): ProgramSupTotalsAdapter {
  return (campaignId) => {
    if (scenario === 'loading') return { data: null, isLoading: true, error: null }
    if (scenario === 'requestFailed') {
      return { data: null, isLoading: false, error: 'SUP program totals request failed (500)' }
    }
    return { data: SUP_TOTALS_FIXTURES[campaignId] ?? null, isLoading: false, error: null }
  }
}

function StoryShell({ children, dataTestId }: { children: React.ReactNode; dataTestId: string }) {
  return (
    <MiniAppShell>
      <YStack
        data-testid={dataTestId}
        style={{ width: '100%', maxWidth: 480, minHeight: '100vh', boxSizing: 'border-box' }}
      >
        {children}
      </YStack>
    </MiniAppShell>
  )
}

function SuperfluidCampaignWidgetStoryShell({
  provider,
  dataTestId,
  initialView = 'content',
  airdropStatusAdapter,
  leaderboardAdapter,
  supTotalsAdapter = fixedProgramSupTotalsAdapter('populated'),
}: {
  provider: unknown
  dataTestId: string
  initialView?: SuperfluidCampaignView
  airdropStatusAdapter?: AirdropStatusAdapter
  leaderboardAdapter?: CampaignLeaderboardAdapter
  supTotalsAdapter?: ProgramSupTotalsAdapter
}) {
  return (
    <StoryShell dataTestId={dataTestId}>
      <SuperfluidCampaignWidget
        provider={provider}
        environment="production"
        initialView={initialView}
        airdropStatusAdapter={airdropStatusAdapter}
        leaderboardAdapter={leaderboardAdapter}
        supTotalsAdapter={supTotalsAdapter}
      />
    </StoryShell>
  )
}

/**
 * Showcase story — real injected wallet (MetaMask, Rabby, etc.) with live API data.
 * No adapter overrides are passed so all three data sources (airdrop status,
 * leaderboard, SUP totals) hit the live endpoints.
 */
export function InjectedWalletStory({
  defaultTheme,
  themeOverrides,
  initialView = 'content',
}: {
  defaultTheme?: 'light' | 'dark'
  themeOverrides?: GoodWidgetThemeOverrides
  initialView?: SuperfluidCampaignView
} = {}) {
  const injectedProvider = getInjectedEip1193Provider()
  const usableProvider = isInjectedProviderUsable(injectedProvider)

  if (!usableProvider) {
    return (
      <YStack data-testid="SuperfluidCampaignWidget-no-injected-wallet" style={{ width: 420 }} gap="$3">
        <strong>No injected wallet found</strong>
        <span>
          Install/enable MetaMask (or another EIP-1193 wallet) in this browser, then refresh Storybook.
        </span>
      </YStack>
    )
  }

  return (
    <StoryShell dataTestId="SuperfluidCampaignWidget-injected-wallet">
      <SuperfluidCampaignWidget
        provider={injectedProvider}
        environment="production"
        initialView={initialView}
        defaultTheme={defaultTheme}
        themeOverrides={themeOverrides}
      />
    </StoryShell>
  )
}

/**
 * Showcase story — no wallet connected, live API data.
 * Shows the public/disconnected view with real leaderboard and SUP-totals data.
 */
export function LiveDataNoWalletStory({
  defaultTheme,
  themeOverrides,
  initialView = 'content',
  poolAddresses,
}: {
  defaultTheme?: 'light' | 'dark'
  themeOverrides?: GoodWidgetThemeOverrides
  initialView?: SuperfluidCampaignView
  poolAddresses?: SuperfluidCampaignWidgetProps['poolAddresses']
} = {}) {
  return (
    <StoryShell dataTestId="SuperfluidCampaignWidget-live-no-wallet">
      <SuperfluidCampaignWidget
        provider={undefined}
        environment="production"
        initialView={initialView}
        poolAddresses={poolAddresses}
        defaultTheme={defaultTheme}
        themeOverrides={themeOverrides}
      />
    </StoryShell>
  )
}

/**
 * QA fixture — deterministic custodial wallet, reproducible for Playwright
 * screenshots. Defaults the airdrop-status card to the "not whitelisted"
 * fixture (the one shape actually observed from the live endpoint) rather
 * than leaving it to hit the network, which would make the leaderboard
 * screenshot's airdrop card non-deterministic across CI runs.
 */
export function CustodialLocalFixtureStory({
  initialView,
  airdropStatusAdapter = fixedAirdropStatusAdapter('notWhitelisted'),
  leaderboardAdapter = fixedCampaignLeaderboardAdapter('populated'),
  supTotalsAdapter = fixedProgramSupTotalsAdapter('populated'),
}: {
  initialView?: SuperfluidCampaignView
  airdropStatusAdapter?: AirdropStatusAdapter
  leaderboardAdapter?: CampaignLeaderboardAdapter
  supTotalsAdapter?: ProgramSupTotalsAdapter
}) {
  try {
    const provider = createCustodialEip1193Provider()
    return (
      <SuperfluidCampaignWidgetStoryShell
        provider={provider}
        dataTestId="SuperfluidCampaignWidget-custodial-wallet"
        initialView={initialView}
        airdropStatusAdapter={airdropStatusAdapter}
        leaderboardAdapter={leaderboardAdapter}
        supTotalsAdapter={supTotalsAdapter}
      />
    )
  } catch (error: unknown) {
    return (
      <YStack data-testid="SuperfluidCampaignWidget-custodial-config-error" style={{ width: 420 }}>
        <strong>Custodial fixture not configured</strong>
        <span>{error instanceof Error ? error.message : 'Set a local private key in custodialEip1193.ts'}</span>
      </YStack>
    )
  }
}

/** QA fixture — custodial wallet with the airdrop-status card fixed to a single scenario. */
export function CustodialAirdropStatusStory({
  scenario,
}: {
  scenario: keyof typeof AIRDROP_STATUS_FIXTURES
}) {
  return <CustodialLocalFixtureStory initialView="leaderboard" airdropStatusAdapter={fixedAirdropStatusAdapter(scenario)} />
}

/** QA fixture — no wallet connected, matches the disconnected (public) mockup. */
export function NoWalletStory({
  initialView,
  leaderboardAdapter = fixedCampaignLeaderboardAdapter('populated'),
  supTotalsAdapter = fixedProgramSupTotalsAdapter('populated'),
}: {
  initialView?: SuperfluidCampaignView
  leaderboardAdapter?: CampaignLeaderboardAdapter
  supTotalsAdapter?: ProgramSupTotalsAdapter
}) {
  return (
    <SuperfluidCampaignWidgetStoryShell
      provider={undefined}
      dataTestId="SuperfluidCampaignWidget-no-wallet"
      initialView={initialView}
      leaderboardAdapter={leaderboardAdapter}
      supTotalsAdapter={supTotalsAdapter}
    />
  )
}

/** QA fixture — no wallet connected, SUP-totals fixed to a single scenario (requestFailed/populated). */
export function NoWalletSupTotalsStory({
  scenario,
}: {
  scenario: 'populated' | 'loading' | 'requestFailed'
}) {
  return <NoWalletStory initialView="content" supTotalsAdapter={fixedProgramSupTotalsAdapter(scenario)} />
}

/** QA fixture — no wallet connected, leaderboard fixed to a single scenario (loading/error/populated). */
export function NoWalletLeaderboardStory({
  scenario,
}: {
  scenario: 'populated' | 'loading' | 'requestFailed'
}) {
  return <NoWalletStory initialView="leaderboard" leaderboardAdapter={fixedCampaignLeaderboardAdapter(scenario)} />
}
