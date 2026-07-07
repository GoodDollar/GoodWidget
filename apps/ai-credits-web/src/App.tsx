import React from 'react'
import { AiCreditsWidget } from '@goodwidget/ai-credits-widget'
import { Container, Text, YStack } from '@goodwidget/ui'

function getInjectedProvider(): unknown | null {
  if (typeof window === 'undefined') return null
  return window.ethereum ?? null
}

function envAddress(value: string | undefined): `0x${string}` | undefined {
  return value ? (value as `0x${string}`) : undefined
}

export function App() {
  const provider = getInjectedProvider()

  if (!provider) {
    return (
      <Container>
        <YStack gap="$3" paddingVertical="$6">
          <Text fontWeight="700">No wallet found</Text>
          <Text secondary>
            Install or enable a browser wallet (e.g. Rabby, MetaMask), then refresh this page.
          </Text>
        </YStack>
      </Container>
    )
  }

  return (
    <Container>
      <AiCreditsWidget
        provider={provider}
        backendUrl={import.meta.env.VITE_AI_CREDITS_BACKEND_URL}
        baseRpcUrl={import.meta.env.VITE_AI_CREDITS_BASE_RPC_URL}
        celoRpcUrl={import.meta.env.VITE_AI_CREDITS_CELO_RPC_URL}
        fundingVaultAddress={envAddress(import.meta.env.VITE_AI_CREDITS_FUNDING_VAULT_ADDRESS)}
        vaultAddress={envAddress(import.meta.env.VITE_AI_CREDITS_VAULT_ADDRESS)}
        goodIdAddress={envAddress(import.meta.env.VITE_AI_CREDITS_GOODID_ADDRESS)}
        testId="AiCreditsWidget-web"
      />
    </Container>
  )
}
