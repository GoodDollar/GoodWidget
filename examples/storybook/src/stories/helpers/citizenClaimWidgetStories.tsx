import React, { useEffect, useState } from 'react'
import { Card, Text, WidgetTabs, YStack } from '@goodwidget/ui'
import { CitizenClaimWidget, type CitizenClaimWidgetProps } from '@goodwidget/citizen-claim-widget'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'

type CitizenClaimTab = 'claim' | 'invite-rewards' | 'news-feed'

function CitizenClaimWidgetStoryShell({
  provider,
  dataTestId,
  defaultTheme,
  themeOverrides,
}: {
  provider: unknown
  dataTestId: string
  defaultTheme?: 'light' | 'dark'
  themeOverrides?: CitizenClaimWidgetProps['themeOverrides']
}) {
  const [activeTab, setActiveTab] = useState<CitizenClaimTab>('claim')
  const [activeChainId, setActiveChainId] = useState<number | null>(null)

  useEffect(() => {
    const eip1193Provider = provider as {
      request?: (args: { method: string }) => Promise<unknown>
      on?: (event: string, listener: (value: unknown) => void) => void
      removeListener?: (event: string, listener: (value: unknown) => void) => void
    } | null

    if (!eip1193Provider?.request) return

    const syncChain = async () => {
      const hex = (await eip1193Provider.request?.({ method: 'eth_chainId' })) as string
      if (typeof hex === 'string') setActiveChainId(parseInt(hex, 16))
    }

    const onChainChanged = (hex: unknown) => {
      if (typeof hex === 'string') setActiveChainId(parseInt(hex, 16))
    }

    void syncChain()
    eip1193Provider.on?.('chainChanged', onChainChanged)
    return () => eip1193Provider.removeListener?.('chainChanged', onChainChanged)
  }, [provider])

  return (
    <YStack data-testid={dataTestId} style={{ width: 380, height: '100vh' }}>
      <WidgetTabs
        tabs={[
          { id: 'claim', label: 'Claim' },
          { id: 'invite-rewards', label: 'Invite Rewards' },
          { id: 'news-feed', label: 'News' },
        ]}
        activeTab={activeTab}
        onTabChange={(tabId: string) => setActiveTab(tabId as CitizenClaimTab)}
        chainId={activeChainId ?? 42220}
      />

      {activeTab === 'claim' ? (
        <CitizenClaimWidget
          provider={provider}
          environment="development"
          defaultTheme={defaultTheme}
          themeOverrides={themeOverrides}
        />
      ) : (
        <Card>
          <YStack alignItems="center" justifyContent="center" minHeight={320}>
            <Text variant="body">Widget coming soon</Text>
          </YStack>
        </Card>
      )}
    </YStack>
  )
}

export function InjectedWalletStory({
  defaultTheme,
  themeOverrides,
}: {
  defaultTheme?: 'light' | 'dark'
  themeOverrides?: CitizenClaimWidgetProps['themeOverrides']
} = {}) {
  const injectedProvider = getInjectedEip1193Provider()
  const usableProvider = isInjectedProviderUsable(injectedProvider)

  if (!usableProvider) {
    return (
      <YStack data-testid="CitizenClaimWidget-no-wallet" style={{ width: 420 }} gap="$3">
        <strong>No injected wallet found</strong>
        <span>
          Install/enable MetaMask (or another EIP-1193 wallet) in this browser, then refresh
          Storybook.
        </span>
      </YStack>
    )
  }

  return (
    <CitizenClaimWidgetStoryShell
      provider={injectedProvider}
      dataTestId="CitizenClaimWidget-injected-wallet"
      defaultTheme={defaultTheme}
      themeOverrides={themeOverrides}
    />
  )
}

export function CustodialLocalFixtureStory({
  defaultTheme,
  themeOverrides,
}: {
  defaultTheme?: 'light' | 'dark'
  themeOverrides?: CitizenClaimWidgetProps['themeOverrides']
} = {}) {
  try {
    const provider = createCustodialEip1193Provider()
    return (
      <CitizenClaimWidgetStoryShell
        provider={provider}
        dataTestId="CitizenClaimWidget-custodial-wallet"
        defaultTheme={defaultTheme}
        themeOverrides={themeOverrides}
      />
    )
  } catch (error: unknown) {
    return (
      <YStack data-testid="CitizenClaimWidget-custodial-config-error" style={{ width: 420 }}>
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
