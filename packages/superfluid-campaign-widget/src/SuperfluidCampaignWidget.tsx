import React, { useState } from 'react'
import { GoodWidgetProvider, useWallet } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import { CitizenClaimWidget } from '@goodwidget/citizen-claim-widget'
import { Card, Heading, Text, ToastContainer, YStack } from '@goodwidget/ui'
import { CampaignHeader } from './components/CampaignHeader'
import { ConnectWalletPrompt } from './components/ConnectWalletPrompt'
import { FaqAccordion } from './components/FaqAccordion'
import { LeaderboardSummary } from './components/LeaderboardSummary'
import { LeaderboardView } from './components/LeaderboardView'
import { RewardPoolSection } from './components/RewardPoolSection'
import { useAirdropStatus } from './hooks/useAirdropStatus'
import { DEFAULT_CAMPAIGN_MOCK_DATA, CONNECTED_CAMPAIGN_MOCK_DATA } from './mockData'
import type {
  CampaignActionMockData,
  SuperfluidCampaignView,
  SuperfluidCampaignWidgetProps,
} from './widgetRuntimeContract'

/** Which embedded CitizenClaimWidget tab (if any) is currently open as a CTA overlay. */
type EmbeddedClaimTab = 'claim' | 'invite-rewards' | null

interface SuperfluidCampaignRuntimeProps {
  data: SuperfluidCampaignWidgetProps['data']
  citizenClaimEnvironment: SuperfluidCampaignWidgetProps['citizenClaimEnvironment']
  initialView: SuperfluidCampaignView
  /** Forwarded to the embedded CitizenClaimWidget so it shares the same provider/config/theme context. */
  provider?: SuperfluidCampaignWidgetProps['provider']
  config?: SuperfluidCampaignWidgetProps['config']
  themeOverrides?: SuperfluidCampaignWidgetProps['themeOverrides']
  defaultTheme?: SuperfluidCampaignWidgetProps['defaultTheme']
  airdropStatusAdapter?: SuperfluidCampaignWidgetProps['airdropStatusAdapter']
}

/**
 * Routes a CampaignActionMockData CTA press to its handler:
 *   - claim-widget-claim / claim-widget-invite → open the embedded CitizenClaimWidget
 *     on the matching tab
 *   - external-link → open the Flow State / Gardens URL in a new tab, mirroring the
 *     window.open(url, '_blank', 'noopener,noreferrer') pattern already used for
 *     external verification links in citizen-claim-widget/ai-credits-widget
 */
function handleActionCta(action: CampaignActionMockData, openClaimTab: (tab: EmbeddedClaimTab) => void) {
  switch (action.ctaKind) {
    case 'claim-widget-claim':
      openClaimTab('claim')
      return
    case 'claim-widget-invite':
      openClaimTab('invite-rewards')
      return
    case 'external-link':
      if (action.href) {
        window.open(action.href, '_blank', 'noopener,noreferrer')
      }
      return
  }
}

function SuperfluidCampaignRuntime({ data, citizenClaimEnvironment, initialView, provider, config, themeOverrides, defaultTheme, airdropStatusAdapter }: SuperfluidCampaignRuntimeProps) {
  const { isConnected, connect, address } = useWallet()
  const [view, setView] = useState<SuperfluidCampaignView>(initialView)
  const [embeddedClaimTab, setEmbeddedClaimTab] = useState<EmbeddedClaimTab>(null)

  // Keyed on `address` alone (see useAirdropStatus) so this fires on connect, on
  // load when already connected, and on address change — not on every render.
  // airdropStatusAdapter, when supplied, replaces the live fetch with a fixed
  // result for deterministic Storybook/Playwright fixtures.
  const airdropStatus = useAirdropStatus(address, airdropStatusAdapter)

  // The mock dataset's connected-user leaderboard row only exists once a wallet
  // is connected — swap in the connected fixture rather than mutating null in place.
  const campaignData = data ?? (isConnected ? CONNECTED_CAMPAIGN_MOCK_DATA : DEFAULT_CAMPAIGN_MOCK_DATA)

  if (embeddedClaimTab) {
    return (
      <YStack gap="$3" width="100%">
        <CitizenClaimWidget
          provider={provider}
          config={config}
          themeOverrides={themeOverrides}
          defaultTheme={defaultTheme}
          environment={citizenClaimEnvironment}
          initialTab={embeddedClaimTab}
        />
        <Text variant="caption" secondary center onPress={() => setEmbeddedClaimTab(null)} cursor="pointer">
          Back to campaign
        </Text>
      </YStack>
    )
  }

  if (view === 'leaderboard') {
    return (
      <LeaderboardView
        leaderboard={campaignData.leaderboard}
        isConnected={isConnected}
        onConnect={connect}
        onClose={() => setView('content')}
        airdropStatus={airdropStatus}
      />
    )
  }

  return (
    <YStack gap="$5" width="100%" padding="$5" style={{ boxSizing: 'border-box' }}>
      <CampaignHeader data={campaignData} />

      {/* Required disconnected-state CTA per #127 acceptance criteria — hidden once a wallet is connected. */}
      {!isConnected && <ConnectWalletPrompt onConnect={connect} />}

      <LeaderboardSummary leaderboard={campaignData.leaderboard} onViewLeaderboard={() => setView('leaderboard')} />

      <YStack gap="$1">
        <Heading level={4}>How to participate</Heading>
        <Text secondary>
          Complete eligible actions across the two campaign pools to earn points. Your share of each pool is based
          on the points you earn in that pool.
        </Text>
      </YStack>

      {/* Pools always stack vertically at every breakpoint — no responsive change here. */}
      <YStack gap="$5" width="100%">
        {campaignData.pools.map((pool) => (
          <RewardPoolSection
            key={pool.id}
            pool={pool}
            onPressActionCta={(action) => handleActionCta(action, setEmbeddedClaimTab)}
          />
        ))}
      </YStack>

      <FaqAccordion faq={campaignData.faq} />
    </YStack>
  )
}

export function SuperfluidCampaignWidget({
  provider,
  themeOverrides,
  config,
  defaultTheme = 'dark',
  data,
  citizenClaimEnvironment = 'production',
  initialView = 'content',
  airdropStatusAdapter,
}: SuperfluidCampaignWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <Card padding={0} backgroundColor="$backgroundDark" width="100%">
        <SuperfluidCampaignRuntime
          data={data}
          citizenClaimEnvironment={citizenClaimEnvironment}
          initialView={initialView}
          provider={provider}
          config={config}
          themeOverrides={themeOverrides}
          defaultTheme={defaultTheme}
          airdropStatusAdapter={airdropStatusAdapter}
        />
      </Card>
      <ToastContainer />
    </GoodWidgetProvider>
  )
}
