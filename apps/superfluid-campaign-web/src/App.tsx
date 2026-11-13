import React from 'react'
import { SuperfluidCampaignWidget } from '@goodwidget/superfluid-campaign-widget'
import type { CampaignActionLinkOverrides } from '@goodwidget/superfluid-campaign-widget'
import {
  DefaultAppKitProvider,
  useAppKitSession,
} from '@goodwidget/embed/appkit-provider'
import { TamaguiProvider } from '@tamagui/core'
import { YStack, defaultConfig } from '@goodwidget/ui'

const DESKTOP_WIDGET_MAX_WIDTH = 960

/**
 * Tracked ubi.gd destinations for the standalone app. Invite, Vote on Flow State
 * and Fund GoodBuilders are intentionally absent: those cards are disabled for
 * Season 7 and must not carry a link.
 */
const STANDALONE_ACTION_LINKS: CampaignActionLinkOverrides = {
  'claim-ubi': 'https://ubi.gd/4BTD7Vb',
  'gardens-donation': 'https://ubi.gd/4eunQAd',
  'gardens-funding': 'https://ubi.gd/4zEWvDW',
  'ai-credits-purchase': 'https://ubi.gd/3UFIqH3',
  'ai-credits-subscription': 'https://ubi.gd/4AslL0c',
}

/** Tracked ubi.gd link opened by the header's "Claim SUP rewards" button. */
const STANDALONE_CLAIM_REWARDS_URL = 'https://ubi.gd/4iN7RhK'

/**
 * Pressing the disconnect-menu item under AppKit opens AppKit's own Account
 * view (see disconnectOverride below) rather than ending the session
 * directly, so the button is labeled to match what it actually does.
 */
const APPKIT_DISCONNECT_LABEL = 'Network settings'

function AppKitSuperfluidCampaignWidget() {
  const { open, ...walletSession } = useAppKitSession({ requireProviderForConnected: false })

  return (
    <SuperfluidCampaignWidget
      {...walletSession}
      defaultTheme="dark"
      contentMaxWidth={DESKTOP_WIDGET_MAX_WIDTH}
      disconnectLabel={APPKIT_DISCONNECT_LABEL}
      disconnectIcon="settings"
      disconnectOverride={async () => {
        await open({ view: 'Account' })
      }}
      actionLinks={STANDALONE_ACTION_LINKS}
      claimRewardsUrl={STANDALONE_CLAIM_REWARDS_URL}
    />
  )
}

function CampaignWidgetFrame() {
  const projectId = import.meta.env.VITE_REOWN_PROJECT_ID

  if (projectId) {
    return (
      <DefaultAppKitProvider enableWallets enableInjected>
        <AppKitSuperfluidCampaignWidget />
      </DefaultAppKitProvider>
    )
  }

  return (
    <SuperfluidCampaignWidget
      provider={typeof window === 'undefined' ? undefined : window.ethereum}
      defaultTheme="dark"
      contentMaxWidth={DESKTOP_WIDGET_MAX_WIDTH}
      actionLinks={STANDALONE_ACTION_LINKS}
      claimRewardsUrl={STANDALONE_CLAIM_REWARDS_URL}
    />
  )
}

export function App() {
  return (
    <TamaguiProvider config={defaultConfig} defaultTheme="dark">
      <YStack
        tag="main"
        minHeight="100vh"
        width="100%"
        alignItems="center"
        justifyContent="center"
        padding="$5"
        backgroundColor="$backgroundDark"
        data-testid="superfluid-campaign-page"
        style={{
          backgroundImage: [
            'radial-gradient(ellipse 50% 48% at 17% 48%, rgba(17, 96, 230, 0.32), transparent 72%)',
            'radial-gradient(ellipse 58% 34% at 58% 3%, rgba(13, 77, 181, 0.24), transparent 76%)',
            'radial-gradient(ellipse 48% 45% at 92% 68%, rgba(8, 63, 145, 0.18), transparent 74%)',
            'linear-gradient(rgba(61, 130, 224, 0.055) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(61, 130, 224, 0.055) 1px, transparent 1px)',
          ].join(', '),
          backgroundPosition: 'center, center, center, 0 0, 0 0',
          backgroundRepeat: 'no-repeat, no-repeat, no-repeat, repeat, repeat',
          backgroundSize: 'auto, auto, auto, 24px 24px, 24px 24px',
        }}
        $sm={{ padding: '$3', justifyContent: 'flex-start' }}
      >
        <YStack
          width="100%"
          maxWidth={DESKTOP_WIDGET_MAX_WIDTH}
          $sm={{ maxWidth: 480 }}
          data-testid="superfluid-campaign-frame"
        >
          <CampaignWidgetFrame />
        </YStack>
      </YStack>
    </TamaguiProvider>
  )
}
