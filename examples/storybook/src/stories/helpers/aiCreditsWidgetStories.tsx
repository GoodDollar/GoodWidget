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

// ---------------------------------------------------------------------------
// Mock state factory — creates deterministic adapter state for each story
// ---------------------------------------------------------------------------

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
    apiKey: null,
    depositAmount: '5',
    streamAmount: '0',
    bonusPercent: 10,
    quote: null,
    setupSnippet: null,
    usageLog: [],
    error: null,
    primaryAction: 'generate_key',
    primaryLabel: 'Set Up Buyer Key',
  }
  return { ...base, ...overrides }
}

/** Creates a mock adapter factory returning deterministic state for stories */
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
      pasteBuyerKey: () => {},
      confirmBuyerKey: () => {},
      signOperatorConsent: async () => {},
      setDepositAmount: () => {},
      setStreamAmount: () => {},
      pay: async () => {},
      refresh: async () => {},
      retry: async () => {},
    },
  })
}

// ---------------------------------------------------------------------------
// Shell wrapper — provides a consistent width for all story variants
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Exported story components — one per widget state
// ---------------------------------------------------------------------------

/** S1: disconnected — no wallet connected */
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

/** S2: connected_empty — wallet connected, G$ balance = 0 */
export function ConnectedEmptyStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-connected-empty"
      adapterFactory={createAdapterFactory('connected_empty', {
        gBalance: '0',
        primaryAction: 'generate_key',
        primaryLabel: 'Set Up Buyer Key',
      })}
    />
  )
}

/** S3: quote_ready — amounts set, buyer key confirmed, consent signed */
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

/** S3 with GoodID — 20% streaming bonus visible */
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

/** S4: payment_pending — Celo tx submitted */
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

/** S5: payment_confirmed — Celo tx mined, Base settling */
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

/** S6: has_credits — credits landed, setup snippet visible */
export function HasCreditsStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-has-credits"
      adapterFactory={createAdapterFactory('has_credits', {
        aiCreditsBalance: '110.00',
        setupSnippet: `ANTSEED_API_KEY="0xabcdef1234567890abcdef1234567890abcdef12"\nANTSEED_BASE_URL="https://api.antseed.xyz/v1"`,
        primaryAction: 'refresh',
        primaryLabel: 'Refresh',
      })}
    />
  )
}

/** S7: usage_empty — credits exhausted after prior purchase */
export function UsageEmptyStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-usage-empty"
      adapterFactory={createAdapterFactory('usage_empty', {
        aiCreditsBalance: '0',
        setupSnippet: `ANTSEED_API_KEY="0xabcdef1234567890abcdef1234567890abcdef12"\nANTSEED_BASE_URL="https://api.antseed.xyz/v1"`,
        primaryAction: 'refresh',
        primaryLabel: 'Refresh',
      })}
    />
  )
}

/** S8: usage_active — credits > 0 with usage log */
export function UsageActiveStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-usage-active"
      adapterFactory={createAdapterFactory('usage_active', {
        aiCreditsBalance: '87.50',
        setupSnippet: `ANTSEED_API_KEY="0xabcdef1234567890abcdef1234567890abcdef12"\nANTSEED_BASE_URL="https://api.antseed.xyz/v1"`,
        usageLog: [
          {
            sessionId: 'sess-001',
            timestamp: '2025-06-20T10:00:00Z',
            creditsUsed: 12.5,
            model: 'claude-3-5-sonnet',
          },
          {
            sessionId: 'sess-002',
            timestamp: '2025-06-21T14:30:00Z',
            creditsUsed: 8.0,
            model: 'gpt-4o',
          },
        ],
        primaryAction: 'refresh',
        primaryLabel: 'Refresh',
      })}
    />
  )
}

/** S9: insufficient_g_balance — balance below minimum */
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

/** S11: payment_failed — Celo tx reverted */
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

/** S12: backend_unavailable — service unreachable */
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

/** S13: unsupported_chain — wrong chain connected */
export function UnsupportedChainStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-unsupported-chain"
      adapterFactory={createAdapterFactory('unsupported_chain', {
        chainId: 1, // Ethereum mainnet
        primaryAction: 'switch_chain',
        primaryLabel: 'Switch to Celo',
      })}
    />
  )
}

/** Injected wallet — live integration showcase */
export function InjectedWalletStory() {
  const injectedProvider = getInjectedEip1193Provider()
  const backendUrl = import.meta.env.VITE_AI_CREDITS_BACKEND_URL

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
      <AiCreditsWidget provider={injectedProvider} backendUrl={backendUrl} />
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
