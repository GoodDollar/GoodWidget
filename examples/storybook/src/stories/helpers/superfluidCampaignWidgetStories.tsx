import React from 'react'
import { SuperfluidCampaignWidget, type SuperfluidCampaignView } from '@goodwidget/superfluid-campaign-widget'
import { MiniAppShell, YStack } from '@goodwidget/ui'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import { getInjectedEip1193Provider, isInjectedProviderUsable } from '../../fixtures/injectedEip1193'

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
}: {
  provider: unknown
  dataTestId: string
  initialView?: SuperfluidCampaignView
}) {
  return (
    <StoryShell dataTestId={dataTestId}>
      <SuperfluidCampaignWidget provider={provider} environment="production" initialView={initialView} />
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

/** QA fixture — deterministic custodial wallet, reproducible for Playwright screenshots. */
export function CustodialLocalFixtureStory({ initialView }: { initialView?: SuperfluidCampaignView }) {
  try {
    const provider = createCustodialEip1193Provider()
    return (
      <SuperfluidCampaignWidgetStoryShell
        provider={provider}
        dataTestId="SuperfluidCampaignWidget-custodial-wallet"
        initialView={initialView}
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
