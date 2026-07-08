import React, { useEffect, useState } from 'react'
import { YStack } from '@goodwidget/ui'
import { CitizenClaimWidget } from '@goodwidget/citizen-claim-widget'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'

function CitizenClaimWidgetStoryShell({
  provider,
  dataTestId,
}: {
  provider: unknown
  dataTestId: string
}) {
  // const [activeTab, setActiveTab] = useState<CitizenClaimTab>('claim')
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
    <CitizenClaimWidget
      provider={provider}
      environment="development"
      data-testid={dataTestId}
      chainId={activeChainId ?? 42220}
    />
  )
}

export function InjectedWalletStory() {
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
    />
  )
}

export function CustodialLocalFixtureStory() {
  try {
    const provider = createCustodialEip1193Provider()
    return (
      <CitizenClaimWidgetStoryShell
        provider={provider}
        dataTestId="CitizenClaimWidget-custodial-wallet"
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
