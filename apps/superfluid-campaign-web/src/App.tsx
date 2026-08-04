import React, { useRef } from 'react'
import { SuperfluidCampaignWidget } from '@goodwidget/superfluid-campaign-widget'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  DefaultAppKitProvider,
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
} from '@goodwidget/embed/appkit-provider'
import { TamaguiProvider } from '@tamagui/core'
import { YStack, defaultConfig } from '@goodwidget/ui'

const DESKTOP_WIDGET_MAX_WIDTH = 960

function AppKitSuperfluidCampaignWidget() {
  const { open } = useAppKit()
  const { address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<EIP1193Provider | undefined>('eip155')
  const addressRef = useRef(address)
  addressRef.current = address

  return (
    <SuperfluidCampaignWidget
      provider={walletProvider}
      defaultTheme="dark"
      contentMaxWidth={DESKTOP_WIDGET_MAX_WIDTH}
      connectOverride={async () => {
        await open({ view: 'Connect' })
        if (!addressRef.current) throw new Error('wallet_connect_cancelled')
      }}
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
