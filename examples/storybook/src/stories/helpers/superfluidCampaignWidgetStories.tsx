import React from 'react'
import {
  SuperfluidCampaignWidget,
  type SuperfluidCampaignWidgetProps,
  type SuperfluidCampaignView,
} from '@goodwidget/superfluid-campaign-widget'
import {
  MockSuperfluidCampaignWidget,
  type MockLeaderboardScenario,
  type MockProgramSupTotalsScenario,
} from '@goodwidget/superfluid-campaign-widget/mocked'
import { MiniAppShell, YStack, type GoodWidgetThemeOverrides } from '@goodwidget/ui'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'

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

interface MockStoryProps {
  initialView?: SuperfluidCampaignView
  leaderboardScenario?: MockLeaderboardScenario
  programSupTotalsScenario?: MockProgramSupTotalsScenario
}

function MockSuperfluidCampaignWidgetStoryShell({
  provider,
  dataTestId,
  initialView = 'content',
  leaderboardScenario,
  programSupTotalsScenario,
}: MockStoryProps & { provider: unknown; dataTestId: string }) {
  return (
    <StoryShell dataTestId={dataTestId}>
      <MockSuperfluidCampaignWidget
        provider={provider}
        initialView={initialView}
        leaderboardScenario={leaderboardScenario}
        programSupTotalsScenario={programSupTotalsScenario}
      />
    </StoryShell>
  )
}

/** Showcase story: an injected wallet and production endpoint runtime. */
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
      <YStack
        data-testid="SuperfluidCampaignWidget-no-injected-wallet"
        style={{ width: 420 }}
        gap="$3"
      >
        <strong>No injected wallet found</strong>
        <span>
          Install/enable MetaMask (or another EIP-1193 wallet) in this browser, then refresh
          Storybook.
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

/** Showcase/integration story: disconnected UI with production endpoint runtime. */
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

/** QA fixture: deterministic custodial wallet and fully mocked runtime. */
export function CustodialLocalFixtureStory(props: MockStoryProps) {
  try {
    const provider = createCustodialEip1193Provider()
    return (
      <MockSuperfluidCampaignWidgetStoryShell
        {...props}
        provider={provider}
        dataTestId="SuperfluidCampaignWidget-custodial-wallet"
      />
    )
  } catch (error: unknown) {
    return (
      <YStack data-testid="SuperfluidCampaignWidget-custodial-config-error" style={{ width: 420 }}>
        <strong>Custodial fixture not configured</strong>
        <span>
          {error instanceof Error
            ? error.message
            : 'Set a local private key in custodialEip1193.ts'}
        </span>
      </YStack>
    )
  }
}

/** QA fixture: disconnected wallet and fully mocked runtime. */
export function NoWalletStory(props: MockStoryProps) {
  return (
    <MockSuperfluidCampaignWidgetStoryShell
      {...props}
      provider={undefined}
      dataTestId="SuperfluidCampaignWidget-no-wallet"
    />
  )
}

export function NoWalletSupTotalsStory({ scenario }: { scenario: MockProgramSupTotalsScenario }) {
  return <NoWalletStory initialView="content" programSupTotalsScenario={scenario} />
}

export function NoWalletLeaderboardStory({ scenario }: { scenario: MockLeaderboardScenario }) {
  return <NoWalletStory initialView="leaderboard" leaderboardScenario={scenario} />
}
