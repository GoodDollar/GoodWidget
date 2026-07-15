import React, { useRef } from 'react'
import { AiCreditsWidget } from '@goodwidget/ai-credits-widget'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  DefaultAppKitProvider,
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
} from '@goodwidget/embed/appkit-provider'
import { Container } from '@goodwidget/ui'

function envAddress(value: string | undefined): `0x${string}` | undefined {
  return value ? (value as `0x${string}`) : undefined
}

function AiCreditsWidgetApp() {
  const { open } = useAppKit()
  const { address: appKitAddress } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<EIP1193Provider | undefined>('eip155')
  const appKitAddressRef = useRef(appKitAddress)
  appKitAddressRef.current = appKitAddress

  return (
    <Container>
      <AiCreditsWidget
        provider={walletProvider}
        connectOverride={async () => {
          await open({ view: 'Connect' })

          if (!appKitAddressRef.current) {
            throw new Error('wallet_connect_cancelled')
          }
        }}
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

export function App() {
  const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string | undefined

  if (!projectId) {
    return (
      <Container>
        <div>
          AppKit not configured. Set <code>VITE_REOWN_PROJECT_ID</code> in your{' '}
          <code>.env.local</code> to enable wallet connect.
        </div>
      </Container>
    )
  }

  return (
    <DefaultAppKitProvider enableWallets={true} enableInjected={true}>
      <AiCreditsWidgetApp />
    </DefaultAppKitProvider>
  )
}
