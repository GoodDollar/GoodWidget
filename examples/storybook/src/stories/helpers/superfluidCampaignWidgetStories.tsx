import React from 'react'
import {
  SuperfluidCampaignWidget,
  type AirdropStatusAdapter,
  type SuperfluidCampaignView,
} from '@goodwidget/superfluid-campaign-widget'
import { MiniAppShell, YStack } from '@goodwidget/ui'
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
}: {
  provider: unknown
  dataTestId: string
  initialView?: SuperfluidCampaignView
  airdropStatusAdapter?: AirdropStatusAdapter
}) {
  return (
    <StoryShell dataTestId={dataTestId}>
      <SuperfluidCampaignWidget
        provider={provider}
        environment="production"
        initialView={initialView}
        airdropStatusAdapter={airdropStatusAdapter}
      />
    </StoryShell>
  )
}

/** Manual showcase — requires a real injected wallet (MetaMask, Rabby, etc). */
export function InjectedWalletStory() {
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
    <SuperfluidCampaignWidgetStoryShell provider={injectedProvider} dataTestId="SuperfluidCampaignWidget-injected-wallet" />
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
}: {
  initialView?: SuperfluidCampaignView
  airdropStatusAdapter?: AirdropStatusAdapter
}) {
  try {
    const provider = createCustodialEip1193Provider()
    return (
      <SuperfluidCampaignWidgetStoryShell
        provider={provider}
        dataTestId="SuperfluidCampaignWidget-custodial-wallet"
        initialView={initialView}
        airdropStatusAdapter={airdropStatusAdapter}
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
export function NoWalletStory({ initialView }: { initialView?: SuperfluidCampaignView }) {
  return (
    <SuperfluidCampaignWidgetStoryShell
      provider={undefined}
      dataTestId="SuperfluidCampaignWidget-no-wallet"
      initialView={initialView}
    />
  )
}
