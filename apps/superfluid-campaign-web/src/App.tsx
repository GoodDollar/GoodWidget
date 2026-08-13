import React, { useMemo, useRef } from 'react'
import { SuperfluidCampaignWidget } from '@goodwidget/superfluid-campaign-widget'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  DEFAULT_APPKIT_NETWORKS,
  DefaultAppKitProvider,
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
  useAppKitProvider,
} from '@goodwidget/embed/appkit-provider'
import { TamaguiProvider } from '@tamagui/core'
import { YStack, defaultConfig } from '@goodwidget/ui'

const DESKTOP_WIDGET_MAX_WIDTH = 960

/**
 * Pressing the disconnect-menu item under AppKit opens AppKit's own Account
 * view (see disconnectOverride below) rather than ending the session
 * directly, so the button is labeled to match what it actually does.
 */
const APPKIT_DISCONNECT_LABEL = 'Network settings'

function AppKitSuperfluidCampaignWidget() {
  const { open } = useAppKit()
  const { address, status: accountStatus } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<EIP1193Provider | undefined>('eip155')
  const { chainId, switchNetwork, approvedCaipNetworkIds } = useAppKitNetwork()
  const addressRef = useRef(address)
  addressRef.current = address

  // AppKit reports `address: undefined` both while it's still restoring a prior
  // session ('connecting'/'reconnecting'/not yet reported) and once it has
  // definitively resolved to "no wallet". Only the latter is a real override —
  // during the unresolved window this stays `undefined` so the core provider's
  // own EIP-1193 fallback tracking (rather than a premature "disconnected"
  // override) covers the gap until AppKit reports a final status.
  const isAccountResolved = accountStatus === 'connected' || accountStatus === 'disconnected'

  // AppKit's switchNetwork takes the network descriptor object, not a chain id,
  // so this looks up the descriptor for whichever chain the widget wants to
  // switch to. AppKit's own active-network state (chainId here) is always the
  // source of truth for what's "current" — the widget never tracks it separately.
  const appKitNetworksByChainId = useMemo(
    () => new Map(DEFAULT_APPKIT_NETWORKS.map((network) => [Number(network.id), network])),
    [],
  )

  // CAIP network ids are formatted like "eip155:122" — the widget's execute
  // gating needs plain numeric chain ids. `undefined` (AppKit hasn't reported
  // approved networks yet) is kept as `null`, meaning "no restriction known"
  // rather than "nothing is available".
  const availableChainIds = useMemo(
    () =>
      approvedCaipNetworkIds
        ? approvedCaipNetworkIds
            .map((caipId) => Number(caipId.split(':')[1]))
            .filter((id) => Number.isFinite(id))
        : null,
    [approvedCaipNetworkIds],
  )

  return (
    <SuperfluidCampaignWidget
      provider={walletProvider}
      defaultTheme="dark"
      contentMaxWidth={DESKTOP_WIDGET_MAX_WIDTH}
      addressOverride={isAccountResolved ? (address ?? null) : undefined}
      chainIdOverride={chainId == null ? undefined : Number(chainId)}
      availableChainIdsOverride={availableChainIds}
      switchChainOverride={async (targetChainId) => {
        const targetNetwork = appKitNetworksByChainId.get(targetChainId)
        // Falling through to AppKit's own network-selection modal is the
        // documented recovery path when a target chain has no direct
        // programmatic descriptor here, or when switchNetwork itself fails
        // (e.g. the connected wallet rejects the automatic switch request).
        if (!targetNetwork) {
          await open({ view: 'Networks' })
          return
        }
        try {
          await switchNetwork(targetNetwork)
        } catch {
          await open({ view: 'Networks' })
        }
      }}
      disconnectLabel={APPKIT_DISCONNECT_LABEL}
      disconnectIcon="settings"
      connectOverride={async () => {
        await open({ view: 'Connect' })
        if (!addressRef.current) throw new Error('wallet_connect_cancelled')
      }}
      disconnectOverride={async () => {
        await open({ view: 'Account' })
      }}
      actionLinks={{
        'flow-state-vote': 'https://ubi.gd/4fEqvrS',
        'flow-state-funding': 'https://ubi.gd/4z2tH8y',
        'gardens-donation': 'https://ubi.gd/4xhk4kv',
        'gardens-funding': 'https:/ubi.gd/3TABl9O',
        'invite-users': 'https://ubi.gd/4xhYTyH',
        'claim-ubi': 'https://ubi.gd/3RNtzJd',
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
