import React from 'react'
import { YStack } from '@goodwidget/ui'
import {
  AiCreditsWidget,
  type AiCreditsWidgetAdapterFactory,
  type AiCreditsWidgetAdapterState,
  type AiCreditsWidgetStatus,
} from '@goodwidget/ai-credits-widget'
import { DefaultAppKitProvider, useAppKit } from '@goodwidget/embed/appkit-provider'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'

function createMockState(
  status: AiCreditsWidgetStatus,
  overrides: Partial<AiCreditsWidgetAdapterState> = {},
): AiCreditsWidgetAdapterState {
  const base: AiCreditsWidgetAdapterState = {
    status,
    address: '0x329377cbeeF39f01b0Ea04B80465c9eB47D3ED1',
    chainId: 42220,
    gBalance: '42.50',
    gdUsdPerToken: 0.0015,
    totalCreditUsd: null,
    isGoodIdVerified: false,
    buyerPubKey: null,
    buyerPrvKey: null,
    operatorConsented: false,
    operatorAddress: null,
    minDepositUsd: '1.00',
    minStreamUsd: '1.00',
    totalGdDepositedG: null,
    monthlyStreamG: null,
    withdrawableUsd: null,
    error: null,
    activeTab: 'buy',
  }
  return { ...base, ...overrides }
}

function createAdapterFactory(
  status: AiCreditsWidgetStatus,
  overrides: Partial<AiCreditsWidgetAdapterState> = {},
): AiCreditsWidgetAdapterFactory {
  return () => ({
    state: createMockState(status, overrides),
    actions: {
      connect: async () => {},
      switchChain: async () => {},
      generateBuyerKey: async () => {},
      signOperatorConsent: async () => {},
      syncOperatorConsentFromChain: async () => {},
      buildQuote: async (depositG, streamG) => ({
        depositAmountG: depositG,
        streamAmountG: streamG,
      }),
      pay: async () => {},
      refresh: async () => {},
      verifyGoodId: async () => false,
      startPurchase: () => {},
      setActiveTab: () => {},
      closeChannel: async () => {},
      withdrawCredits: async () => {},
      retry: async () => {},
    },
  })
}

function MockStoryShell({
  adapterFactory,
  dataTestId,
}: {
  adapterFactory: AiCreditsWidgetAdapterFactory
  dataTestId: string
}) {
  try {
    const provider = createCustodialEip1193Provider()
    return (
      <YStack data-testid={dataTestId} style={{ width: 380 }}>
        <AiCreditsWidget provider={provider} adapterFactory={adapterFactory} />
      </YStack>
    )
  } catch (error: unknown) {
    return (
      <YStack data-testid="AiCreditsWidget-custodial-config-error" style={{ width: 380 }} gap="$3">
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

export function DisconnectedStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-disconnected"
      adapterFactory={createAdapterFactory('disconnected', {
        address: null,
        chainId: null,
        gBalance: null,
      })}
    />
  )
}

export function ConnectingStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-connecting"
      adapterFactory={createAdapterFactory('connecting', {
        address: '0x329377cbeeF39f01b0Ea04B80465c9eB47D3ED1',
        chainId: 42220,
        gBalance: null,
      })}
    />
  )
}

export function PurchaseSetupStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-purchase-setup"
      adapterFactory={createAdapterFactory('purchase_setup', {
        gBalance: '0',
      })}
    />
  )
}

export function QuoteReadyStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-quote-ready"
      adapterFactory={createAdapterFactory('quote_ready', {
        buyerPubKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        operatorConsented: true,
        gdUsdPerToken: 0.0015,
      })}
    />
  )
}

export function QuoteReadyGoodIdStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-quote-ready-goodid"
      adapterFactory={createAdapterFactory('quote_ready', {
        isGoodIdVerified: true,
        buyerPubKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        operatorConsented: true,
        gdUsdPerToken: 0.0015,
      })}
    />
  )
}

export function PaymentPendingStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-payment-pending"
      adapterFactory={createAdapterFactory('payment_pending', {
        buyerPubKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        operatorConsented: true,
      })}
    />
  )
}

export function PaymentConfirmedStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-payment-confirmed"
      adapterFactory={createAdapterFactory('payment_confirmed', {
        buyerPubKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        operatorConsented: true,
      })}
    />
  )
}

export function ManageTabStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-manage-tab"
      adapterFactory={createAdapterFactory('quote_ready', {
        totalCreditUsd: '110000000',
        buyerPubKey: '0xfc128652c9b397a1f89A9EC84E798B869B0E4c7a',
        operatorConsented: true,
        operatorAddress: '0x0000000000000000000000000000000000000004',
        totalGdDepositedG: '50.00',
        monthlyStreamG: '5.00',
        gBalance: '42.50',
        activeTab: 'manage',
      })}
    />
  )
}

export function CreditsManagementStory() {
  return <ManageTabStory />
}

export function InsufficientGBalanceStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-insufficient-balance"
      adapterFactory={createAdapterFactory('insufficient_g_balance', {
        gBalance: '0.50',
      })}
    />
  )
}

export function PaymentFailedStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-payment-failed"
      adapterFactory={createAdapterFactory('payment_failed', {
        buyerPubKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        operatorConsented: true,
        error: 'Transaction reverted: insufficient allowance',
      })}
    />
  )
}

export function BackendUnavailableStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-backend-unavailable"
      adapterFactory={createAdapterFactory('backend_unavailable', {
        error: 'Could not reach backend — check your connection',
      })}
    />
  )
}

export function UnsupportedChainStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-unsupported-chain"
      adapterFactory={createAdapterFactory('unsupported_chain', {
        chainId: 1,
      })}
    />
  )
}

export function MockBackendStory() {
  const injectedProvider = getInjectedEip1193Provider()

  if (!isInjectedProviderUsable(injectedProvider)) {
    return (
      <YStack data-testid="AiCreditsWidget-no-wallet" style={{ width: 380 }} gap="$3">
        <strong>No injected wallet found</strong>
        <span>
          Install or enable Rabby (or another EIP-1193 wallet) in this browser, then refresh
          Storybook.
        </span>
      </YStack>
    )
  }

  return (
    <YStack data-testid="AiCreditsWidget-mock-backend" style={{ width: 380 }}>
      <AiCreditsWidget provider={injectedProvider} />
    </YStack>
  )
}

/**
 * Inner component that calls useAppKit() – must be rendered inside DefaultAppKitProvider.
 * Passes the AppKit open() as connectOverride so Connect Wallet triggers the real modal.
 */
function AppKitConnectShell() {
  const { open } = useAppKit()
  return (
    <YStack data-testid="AiCreditsWidget-appkit-connect" style={{ width: 380 }}>
      <AiCreditsWidget
        connectOverride={async () => {
          await open()
        }}
      />
    </YStack>
  )
}

/**
 * Story that mounts AiCreditsWidget with DefaultAppKitProvider as the wallet provider.
 * Pressing Connect Wallet triggers the real AppKit modal via the provider-level connect override.
 * Requires VITE_REOWN_PROJECT_ID to be set in examples/storybook/.env.local.
 */
export function AppKitConnectWalletStory() {
  // const projectId = import.meta.env.VITE_REOWN_PROJECT_ID ?? ''

  // if (!projectId) {
  //   return (
  //     <YStack data-testid="AiCreditsWidget-appkit-no-config" style={{ width: 380 }} gap="$3">
  //       <strong>AppKit not configured</strong>
  //       <span>
  //         Set <code>VITE_REOWN_PROJECT_ID</code> in <code>examples/storybook/.env.local</code> to
  //         enable AppKit wallet connect.
  //       </span>
  //     </YStack>
  //   )
  // }

  return (
    <DefaultAppKitProvider projectId={'f21d11c79300d20c1e27975b31eb1643'}>
      <AppKitConnectShell />
    </DefaultAppKitProvider>
  )
}

export function InjectedWalletStory() {
  const injectedProvider = getInjectedEip1193Provider()
  const backendUrl = import.meta.env.VITE_AI_CREDITS_BACKEND_URL
  const baseRpcUrl = import.meta.env.VITE_AI_CREDITS_BASE_RPC_URL
  const celoRpcUrl = import.meta.env.VITE_AI_CREDITS_CELO_RPC_URL
  const fundingVaultAddress = import.meta.env.VITE_AI_CREDITS_FUNDING_VAULT_ADDRESS as
    | `0x${string}`
    | undefined
  const vaultAddress = import.meta.env.VITE_AI_CREDITS_VAULT_ADDRESS as `0x${string}` | undefined
  const goodIdAddress = import.meta.env.VITE_AI_CREDITS_GOODID_ADDRESS as `0x${string}` | undefined

  if (!isInjectedProviderUsable(injectedProvider)) {
    return (
      <YStack data-testid="AiCreditsWidget-no-wallet" style={{ width: 380 }} gap="$3">
        <strong>No injected wallet found</strong>
        <span>
          Install or enable MetaMask (or another EIP-1193 wallet) in this browser, then refresh
          Storybook.
        </span>
      </YStack>
    )
  }

  return (
    <YStack data-testid="AiCreditsWidget-injected-wallet" style={{ width: 380 }} gap="$3">
      <AiCreditsWidget
        provider={injectedProvider}
        backendUrl={backendUrl}
        baseRpcUrl={baseRpcUrl}
        celoRpcUrl={celoRpcUrl}
        fundingVaultAddress={fundingVaultAddress}
        vaultAddress={vaultAddress}
        goodIdAddress={goodIdAddress}
      />
      {!backendUrl && (
        <YStack marginTop="$3">
          <span>
            Set `VITE_AI_CREDITS_BACKEND_URL` in `examples/storybook/.env.local` to enable the AI
            credits backend.
          </span>
        </YStack>
      )}
    </YStack>
  )
}
