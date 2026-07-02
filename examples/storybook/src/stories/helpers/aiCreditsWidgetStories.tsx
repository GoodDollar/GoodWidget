import React from 'react'
import { YStack } from '@goodwidget/ui'
import {
  AiCreditsWidget,
  type AiCreditsWidgetAdapterFactory,
  type AiCreditsWidgetAdapterState,
  type AiCreditsWidgetStatus,
} from '@goodwidget/ai-credits-widget'
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
    aiCreditsBalance: null,
    isGoodIdVerified: false,
    buyerKey: null,
    buyerKeyPrivate: null,
    buyerKeyConfirmed: false,
    operatorConsentSigned: false,
    operatorAddress: null,
    apiKey: null,
    depositAmount: '5',
    streamAmount: '0',
    bonusPercent: 10,
    quote: null,
    setupSnippet: null,
    usageLog: [],
    totalGdDepositedG: null,
    monthlyStreamG: null,
    monthlyStreamCredits: null,
    withdrawableUsd: null,
    channelId: '',
    withdrawAmount: '',
    error: null,
    primaryAction: 'generate_key',
    primaryLabel: 'Set Up Buyer Key',
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
      confirmBuyerKey: () => {},
      signOperatorConsent: async () => {},
      setDepositAmount: () => {},
      setStreamAmount: () => {},
      setChannelId: () => {},
      setWithdrawAmount: () => {},
      pay: async () => {},
      refresh: async () => {},
      startPurchase: () => {},
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
      <YStack data-testid={dataTestId} style={{ width: 420 }}>
        <AiCreditsWidget provider={provider} adapterFactory={adapterFactory} />
      </YStack>
    )
  } catch (error: unknown) {
    return (
      <YStack data-testid="AiCreditsWidget-custodial-config-error" style={{ width: 420 }}>
        <strong>Custodial fixture not configured</strong>
        <span>
          {error instanceof Error ? error.message : 'Set a local private key in custodialEip1193.ts'}
        </span>
      </YStack>
    )
  }
}

const SETUP_SNIPPET = `export ANTSEED_IDENTITY_HEX=<buyer-private-key>\nexport ANTHROPIC_BASE_URL=http://localhost:8377`

export function DisconnectedStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-disconnected"
      adapterFactory={createAdapterFactory('disconnected', {
        address: null,
        chainId: null,
        gBalance: null,
        primaryAction: 'connect',
        primaryLabel: 'Connect Wallet',
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
        primaryAction: 'generate_key',
        primaryLabel: 'Set Up Buyer Key',
      })}
    />
  )
}

export function QuoteReadyStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-quote-ready"
      adapterFactory={createAdapterFactory('quote_ready', {
        buyerKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        buyerKeyConfirmed: true,
        operatorConsentSigned: true,
        depositAmount: '10',
        streamAmount: '5',
        bonusPercent: 10,
        quote: {
          depositAmountG: '10.00',
          streamAmountG: '5.00',
          depositAmountUsd: '0.0150',
          streamAmountUsd: '0.0075',
          bonusPercent: 10,
          totalCredits: '2.75',
        },
        primaryAction: 'pay',
        primaryLabel: 'Buy AI Credits',
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
        buyerKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        buyerKeyConfirmed: true,
        operatorConsentSigned: true,
        depositAmount: '10',
        streamAmount: '5',
        bonusPercent: 20,
        quote: {
          depositAmountG: '10.00',
          streamAmountG: '5.00',
          depositAmountUsd: '0.0150',
          streamAmountUsd: '0.0075',
          bonusPercent: 20,
          totalCredits: '3.00',
        },
        primaryAction: 'pay',
        primaryLabel: 'Buy AI Credits',
      })}
    />
  )
}

export function PaymentPendingStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-payment-pending"
      adapterFactory={createAdapterFactory('payment_pending', {
        buyerKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        buyerKeyConfirmed: true,
        operatorConsentSigned: true,
        primaryAction: 'none',
        primaryLabel: 'Processing…',
      })}
    />
  )
}

export function PaymentConfirmedStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-payment-confirmed"
      adapterFactory={createAdapterFactory('payment_confirmed', {
        buyerKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        buyerKeyConfirmed: true,
        operatorConsentSigned: true,
        primaryAction: 'none',
        primaryLabel: 'Settling…',
      })}
    />
  )
}

export function CreditsManagementStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-credits-management"
      adapterFactory={createAdapterFactory('credits_management', {
        aiCreditsBalance: '110.00',
        buyerKey: '0xfc128652c9b397a1f89A9EC84E798B869B0E4c7a',
        buyerKeyConfirmed: true,
        operatorConsentSigned: true,
        operatorAddress: '0x0000000000000000000000000000000000000004',
        totalGdDepositedG: '50.00',
        monthlyStreamG: '5.00',
        monthlyStreamCredits: '7.50',
        gBalance: '42.50',
        setupSnippet: SETUP_SNIPPET,
        usageLog: [
          {
            sessionId: 'sess-001',
            timestamp: '2025-06-20T10:00:00Z',
            creditsUsed: 12.5,
            model: 'G$ deposit',
            kind: 'funding',
          },
        ],
        primaryAction: 'refresh',
        primaryLabel: 'Refresh',
      })}
    />
  )
}

export function InsufficientGBalanceStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-insufficient-balance"
      adapterFactory={createAdapterFactory('insufficient_g_balance', {
        gBalance: '0.50',
        primaryAction: 'refresh',
        primaryLabel: 'Refresh',
      })}
    />
  )
}

export function PaymentFailedStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-payment-failed"
      adapterFactory={createAdapterFactory('payment_failed', {
        buyerKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        buyerKeyConfirmed: true,
        operatorConsentSigned: true,
        error: 'Transaction reverted: insufficient allowance',
        primaryAction: 'retry',
        primaryLabel: 'Retry',
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
        primaryAction: 'retry',
        primaryLabel: 'Retry',
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
        primaryAction: 'switch_chain',
        primaryLabel: 'Switch to Celo',
      })}
    />
  )
}

export function MockBackendStory() {
  const injectedProvider = getInjectedEip1193Provider()

  if (!isInjectedProviderUsable(injectedProvider)) {
    return (
      <YStack data-testid="AiCreditsWidget-no-wallet" style={{ width: 420 }} gap="$3">
        <strong>No injected wallet found</strong>
        <span>
          Install or enable Rabby (or another EIP-1193 wallet) in this browser, then refresh
          Storybook.
        </span>
      </YStack>
    )
  }

  return (
    <YStack data-testid="AiCreditsWidget-mock-backend" style={{ width: 420 }}>
      <AiCreditsWidget provider={injectedProvider} />
    </YStack>
  )
}

export function InjectedWalletStory() {
  const injectedProvider = getInjectedEip1193Provider()
  const backendUrl = import.meta.env.VITE_AI_CREDITS_BACKEND_URL
  const baseRpcUrl = import.meta.env.VITE_AI_CREDITS_BASE_RPC_URL
  const fundingVaultAddress = import.meta.env.VITE_AI_CREDITS_FUNDING_VAULT_ADDRESS

  if (!isInjectedProviderUsable(injectedProvider)) {
    return (
      <YStack data-testid="AiCreditsWidget-no-wallet" style={{ width: 420 }} gap="$3">
        <strong>No injected wallet found</strong>
        <span>
          Install or enable MetaMask (or another EIP-1193 wallet) in this browser, then refresh
          Storybook.
        </span>
      </YStack>
    )
  }

  return (
    <YStack data-testid="AiCreditsWidget-injected-wallet" style={{ width: 420 }}>
      <AiCreditsWidget
        provider={injectedProvider}
        backendUrl={backendUrl}
        baseRpcUrl={baseRpcUrl}
        fundingVaultAddress={fundingVaultAddress}
      />
      {!backendUrl && (
        <YStack marginTop="$3">
          <span>
            Set `VITE_AI_CREDITS_BACKEND_URL` in `examples/storybook/.env.local` to enable the
            AI credits backend.
          </span>
        </YStack>
      )}
    </YStack>
  )
}
