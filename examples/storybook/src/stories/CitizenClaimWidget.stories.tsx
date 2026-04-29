import React, { useEffect, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Card, Text, WidgetTabs, YStack } from '@goodwidget/ui'
import { CitizenClaimWidget } from '@goodwidget/citizen-claim-widget'
import { getInjectedEip1193Provider, isInjectedProviderUsable } from '../fixtures/injectedEip1193'
import { createCustodialEip1193Provider } from '../fixtures/custodialEip1193'

function InjectedWalletStory() {
  const injectedProvider = getInjectedEip1193Provider()
  const usableProvider = isInjectedProviderUsable(injectedProvider)
  const [activeTab, setActiveTab] = useState<'claim' | 'invite-rewards' | 'news-feed'>('claim')

  const [activeChainId, setActiveChainId] = useState<number | null>(null)

  useEffect(() => {
    if (!injectedProvider) return

    const syncChain = async () => {
      const hex = (await injectedProvider.request({ method: 'eth_chainId' })) as string
      setActiveChainId(parseInt(hex, 16))
    }

    const onChainChanged = (hex: unknown) => {
      if (typeof hex === 'string') setActiveChainId(parseInt(hex, 16))
    }

    void syncChain()
    injectedProvider.on?.('chainChanged', onChainChanged)
    return () => injectedProvider.removeListener?.('chainChanged', onChainChanged)
  }, [injectedProvider])

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
    <YStack
      data-testid="CitizenClaimWidget-injected-wallet"
      style={{ width: 380, height: '100vh' }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <WidgetTabs
        tabs={[
          { id: 'claim', label: 'Claim' },
          { id: 'invite-rewards', label: 'Invite Rewards' },
          { id: 'news-feed', label: 'News' },
        ]}
        activeTab={activeTab}
        onTabChange={(tabId: string) =>
          setActiveTab(tabId as 'claim' | 'invite-rewards' | 'news-feed')
        }
        chainId={activeChainId ?? 42220}
      />

      {activeTab === 'claim' ? (
        <CitizenClaimWidget provider={injectedProvider} environment="development" />
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

const meta: Meta<typeof CitizenClaimWidget> = {
  title: 'Widgets/CitizenClaimWidget',
  component: CitizenClaimWidget,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof CitizenClaimWidget>

export const InjectedWallet: Story = {
  render: () => <InjectedWalletStory />,
}

export const CustodialLocalFixture: Story = {
  render: () => {
    try {
      const provider = createCustodialEip1193Provider()
      return (
        <YStack data-testid="CitizenClaimWidget-custodial-wallet" style={{ width: 380 }}>
          <CitizenClaimWidget provider={provider} environment="development" />
        </YStack>
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
  },
}
