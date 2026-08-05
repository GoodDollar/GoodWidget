import React, { useCallback, useState } from 'react'
import { GoodWidgetProvider, useWallet } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import { CitizenClaimWidget } from '@goodwidget/citizen-claim-widget'
import { Card, Heading, Text, ToastContainer, YStack } from '@goodwidget/ui'
import { CampaignHeader } from './components/CampaignHeader'
import { FaqAccordion } from './components/FaqAccordion'
import { LeaderboardSummary } from './components/LeaderboardSummary'
import { LeaderboardView } from './components/LeaderboardView'
import { RewardPoolSection } from './components/RewardPoolSection'
import { useAirdropStatus } from './hooks/useAirdropStatus'
import { DEFAULT_CAMPAIGN_DEFINITION } from './campaignDefinition'
import {
  PRODUCTION_SUPERFLUID_CAMPAIGN_DATA_CLIENT,
  type SuperfluidCampaignDataClient,
} from './dataClient'
import type {
  CampaignActionDefinition,
  CampaignActionLinkOverrides,
  CampaignDefinition,
  LeaderboardSummaryData,
  SuperfluidCampaignView,
  SuperfluidCampaignWidgetProps,
} from './widgetRuntimeContract'

/** The claim widget is an in-place view within the Superfluid campaign shell. */
type EmbeddedClaimTab = 'claim' | null

interface SuperfluidCampaignRuntimeProps {
  data: SuperfluidCampaignWidgetProps['data']
  actionLinks?: CampaignActionLinkOverrides
  leaderboardSummary?: LeaderboardSummaryData
  dataClient: SuperfluidCampaignDataClient
  citizenClaimEnvironment: SuperfluidCampaignWidgetProps['citizenClaimEnvironment']
  citizenClaimExecution: SuperfluidCampaignWidgetProps['citizenClaimExecution']
  initialView: SuperfluidCampaignView
  poolAddresses?: SuperfluidCampaignWidgetProps['poolAddresses']
  /** Forwarded to the embedded CitizenClaimWidget so it shares the same provider/config/theme context. */
  provider?: SuperfluidCampaignWidgetProps['provider']
  config?: SuperfluidCampaignWidgetProps['config']
  themeOverrides?: SuperfluidCampaignWidgetProps['themeOverrides']
  defaultTheme?: SuperfluidCampaignWidgetProps['defaultTheme']
  hasDisconnectOverride: boolean
}

/**
 * Routes a CampaignActionDefinition CTA press to its handler:
 *   - claim-widget-claim → open the embedded CitizenClaimWidget
 *   - external-link → open the Flow State / Gardens URL in a new tab, mirroring the
 *     window.open(url, '_blank', 'noopener,noreferrer') pattern already used for
 *     external verification links in citizen-claim-widget/ai-credits-widget
 */
function handleActionCta(
  action: CampaignActionDefinition,
  openClaimTab: (tab: EmbeddedClaimTab) => void,
) {
  switch (action.ctaKind) {
    case 'claim-widget-claim':
      openClaimTab('claim')
      return
    case 'claim-widget-invite':
      window.open(
        action.href ?? 'https://goodwallet.xyz/en/gooddollar',
        '_blank',
        'noopener,noreferrer',
      )
      return
    case 'external-link':
      if (action.href) {
        window.open(action.href, '_blank', 'noopener,noreferrer')
      }
      return
  }
}

function applyActionLinkOverrides(
  campaign: CampaignDefinition,
  actionLinks?: CampaignActionLinkOverrides,
): CampaignDefinition {
  if (!actionLinks) return campaign

  return {
    ...campaign,
    pools: campaign.pools.map((pool) => ({
      ...pool,
      actions: pool.actions.map((action) => {
        const href = actionLinks[action.activity]
        return href && action.ctaKind !== 'claim-widget-claim' ? { ...action, href } : action
      }),
    })),
  }
}

function SuperfluidCampaignRuntime({
  data,
  actionLinks,
  leaderboardSummary,
  dataClient,
  citizenClaimEnvironment,
  citizenClaimExecution,
  initialView,
  poolAddresses,
  provider,
  config,
  themeOverrides,
  defaultTheme,
  hasDisconnectOverride,
}: SuperfluidCampaignRuntimeProps) {
  const { isConnected, connect, disconnect, address } = useWallet()
  const [view, setView] = useState<SuperfluidCampaignView>(initialView)
  const [embeddedClaimTab, setEmbeddedClaimTab] = useState<EmbeddedClaimTab>(null)
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0)

  const campaignData = applyActionLinkOverrides(data ?? DEFAULT_CAMPAIGN_DEFINITION, actionLinks)

  const isMockRuntime = dataClient.kind === 'mock'
  const handleAirdropStatusUpdated = useCallback(() => {
    setLeaderboardRefreshKey((current) => current + 1)
  }, [])
  const airdropStatus = useAirdropStatus(
    address,
    isMockRuntime ? dataClient.airdropStatus : undefined,
    handleAirdropStatusUpdated,
  )
  void airdropStatus

  if (embeddedClaimTab) {
    return (
      <YStack gap="$5" width="100%" padding="$5" style={{ boxSizing: 'border-box' }}>
        <CampaignHeader
          data={campaignData}
          address={address}
          isConnected={isConnected}
          onConnect={connect}
          onDisconnect={hasDisconnectOverride ? disconnect : undefined}
          onClose={() => setEmbeddedClaimTab(null)}
        />
        <CitizenClaimWidget
          provider={provider}
          config={config}
          themeOverrides={themeOverrides}
          defaultTheme={defaultTheme}
          environment={citizenClaimEnvironment}
          claimExecution={citizenClaimExecution}
          initialTab={embeddedClaimTab}
        />
      </YStack>
    )
  }

  if (view === 'leaderboard') {
    return (
      <LeaderboardView
        seasonLabel={campaignData.seasonLabel}
        pools={campaignData.pools}
        address={address}
        leaderboardAdapter={isMockRuntime ? dataClient.leaderboard : undefined}
        isConnected={isConnected}
        onConnect={connect}
        onDisconnect={hasDisconnectOverride ? disconnect : undefined}
        onClose={() => setView('content')}
        leaderboardRefreshKey={leaderboardRefreshKey}
        userPointsAdapter={isMockRuntime ? dataClient.userPoints : undefined}
      />
    )
  }

  return (
    <YStack gap="$5" width="100%" padding="$5" style={{ boxSizing: 'border-box' }}>
      {/* Disconnected-state CTA per #127 acceptance criteria now lives in the header's
          top-right slot (see CampaignHeader) instead of its own row here. */}
      <CampaignHeader
        data={campaignData}
        address={address}
        isConnected={isConnected}
        onConnect={connect}
        onDisconnect={hasDisconnectOverride ? disconnect : undefined}
      />

      <LeaderboardSummary
        leaderboard={leaderboardSummary}
        onViewLeaderboard={() => setView('leaderboard')}
      />

      <YStack gap="$1">
        <Heading level={4}>How to participate</Heading>
        <Text tone="soft">
          Complete eligible actions to earn points. Your SUP share is based on your points. Use
          Claim SUP rewards to create or update your rewards stream.
        </Text>
      </YStack>

      {/* Pools always stack vertically at every breakpoint — no responsive change here. */}
      <YStack gap="$5" width="100%">
        {campaignData.pools.map((pool) => (
          <RewardPoolSection
            key={pool.id}
            pool={pool}
            poolAddress={poolAddresses?.[pool.campaignId]}
            onPressActionCta={(action) => handleActionCta(action, setEmbeddedClaimTab)}
            supTotalsAdapter={isMockRuntime ? dataClient.programSupTotals : undefined}
          />
        ))}
      </YStack>

      <FaqAccordion faq={campaignData.faq} />
    </YStack>
  )
}

interface SuperfluidCampaignWidgetWithClientProps extends SuperfluidCampaignWidgetProps {
  dataClient: SuperfluidCampaignDataClient
  leaderboardSummary?: LeaderboardSummaryData
}

/** Shared provider/runtime shell used only by the production and mocked entry points. */
export function SuperfluidCampaignWidgetWithClient({
  provider,
  connectOverride,
  disconnectOverride,
  themeOverrides,
  config,
  defaultTheme = 'dark',
  contentMaxWidth,
  data,
  actionLinks,
  citizenClaimEnvironment = 'production',
  citizenClaimExecution,
  initialView = 'content',
  poolAddresses,
  dataClient,
  leaderboardSummary,
}: SuperfluidCampaignWidgetWithClientProps) {
  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
      connectOverride={connectOverride}
      disconnectOverride={disconnectOverride}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
      contentMaxWidth={contentMaxWidth}
    >
      <Card padding={0} backgroundColor="$backgroundDark" width="100%">
        <SuperfluidCampaignRuntime
          data={data}
          actionLinks={actionLinks}
          leaderboardSummary={leaderboardSummary}
          dataClient={dataClient}
          citizenClaimEnvironment={citizenClaimEnvironment}
          citizenClaimExecution={citizenClaimExecution}
          initialView={initialView}
          poolAddresses={poolAddresses}
          provider={provider}
          config={config}
          themeOverrides={themeOverrides}
          defaultTheme={defaultTheme}
          hasDisconnectOverride={Boolean(disconnectOverride)}
        />
      </Card>
      <ToastContainer />
    </GoodWidgetProvider>
  )
}

/** Production entry point: every changing value is sourced from live endpoints. */
export function SuperfluidCampaignWidget(props: SuperfluidCampaignWidgetProps) {
  return (
    <SuperfluidCampaignWidgetWithClient
      {...props}
      dataClient={PRODUCTION_SUPERFLUID_CAMPAIGN_DATA_CLIENT}
    />
  )
}
