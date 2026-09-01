import React, { useMemo, useRef, useState } from 'react'
import type { EIP1193Provider } from '@goodwidget/core'
import { YStack } from '@goodwidget/ui'
import {
  AiCreditsWidget,
  type AiCreditsWidgetAdapterFactory,
  type AiCreditsWidgetTab,
  type AiCreditsWidgetAdapterState,
  type AiCreditsWidgetStatus,
} from '@goodwidget/ai-credits-widget'
import { MockAiCreditsWidget } from '@goodwidget/ai-credits-widget/mocked'
import {
  DefaultAppKitProvider,
  DEFAULT_APPKIT_NETWORKS,
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
  useAppKitProvider,
  useDisconnect,
} from '@goodwidget/embed/appkit-provider'
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
    totalBonusUsd: null,
    isGoodIdVerified: false,
    signerPubKey: null,
    signerPrvKey: null,
    operatorSignature: null,
    operatorConsented: false,
    operatorConsentPending: false,
    operatorAddress: null,
    currentOperator: null,
    minDepositUsd: '1.00',
    minStreamUsd: '1.00',
    totalGdDepositedG: null,
    monthlyStreamG: null,
    withdrawableUsd: null,
    depositBonusPercent: 10,
    streamBonusPercent: 20,
    error: null,
    activeTab: 'buy',
    signers: [],
    derivedSignerAddress: null,
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
      generateSignerKey: async () => {},
      selectSigner: async () => {},
      discoverSigners: () => {},
      importSignerFromPrivateKey: async () => overrides.signerPubKey ?? null,
      applyDeepLinkSigner: async () => {},
      signOperatorConsent: async () => {},
      revokeOperatorConsent: async () => {},
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

const DISCONNECTED_EIP1193_PROVIDER: EIP1193Provider = {
  request: async ({ method }) => {
    if (method === 'eth_accounts' || method === 'eth_requestAccounts') return []
    if (method === 'eth_chainId') return '0xa4ec'
    throw new Error(`Unsupported method: ${method}`)
  },
  on: () => {},
  removeListener: () => {},
}

function MockStoryShell({
  adapterFactory,
  dataTestId,
  provider,
  showWalletControls,
  disconnectOverride,
}: {
  adapterFactory: AiCreditsWidgetAdapterFactory
  dataTestId: string
  provider?: EIP1193Provider
  showWalletControls?: boolean
  disconnectOverride?: () => Promise<void>
}) {
  const resolvedProviderRef = useRef<EIP1193Provider | null>(provider ?? null)
  const configErrorRef = useRef<unknown>(null)

  // The fixtures return a frozen state object, so `setActiveTab` was a no-op and
  // any flow that switches tabs silently did nothing. Opening How to use is one
  // of those — the widget routes to Set Up to render it, so with a dead
  // setActiveTab the guide never appeared and the Buy panel stayed on screen.
  const [tabOverride, setTabOverride] = useState<AiCreditsWidgetTab | null>(null)
  const statefulAdapterFactory: AiCreditsWidgetAdapterFactory = (input) => {
    const adapter = adapterFactory(input)
    return {
      state: tabOverride ? { ...adapter.state, activeTab: tabOverride } : adapter.state,
      actions: { ...adapter.actions, setActiveTab: setTabOverride },
    }
  }

  if (!resolvedProviderRef.current && !configErrorRef.current) {
    try {
      resolvedProviderRef.current = provider ?? createCustodialEip1193Provider()
    } catch (error: unknown) {
      configErrorRef.current = error
    }
  }

  if (configErrorRef.current) {
    const error = configErrorRef.current
    return (
      <div data-testid="AiCreditsWidget-custodial-config-error" style={{ width: 380 }}>
        <strong>Custodial fixture not configured</strong>
        <span>
          {error instanceof Error
            ? error.message
            : 'Set a local private key in custodialEip1193.ts'}
        </span>
      </div>
    )
  }

  return (
    <div data-testid={dataTestId} style={{ width: 380 }}>
      <AiCreditsWidget
        provider={resolvedProviderRef.current!}
        adapterFactory={statefulAdapterFactory}
        showWalletControls={showWalletControls}
        disconnectOverride={disconnectOverride}
      />
    </div>
  )
}

const DISCONNECTED_ADAPTER_FACTORY = createAdapterFactory('disconnected', {
  address: null,
  chainId: null,
  gBalance: null,
  activeTab: 'setup',
})

export function DisconnectedStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-disconnected"
      provider={DISCONNECTED_EIP1193_PROVIDER}
      adapterFactory={DISCONNECTED_ADAPTER_FACTORY}
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
        activeTab: 'setup',
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
        signerPubKey: '0xabcdef1234567890abcdef1234567890abcdef12',
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
        signerPubKey: '0xabcdef1234567890abcdef1234567890abcdef12',
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
        signerPubKey: '0xabcdef1234567890abcdef1234567890abcdef12',
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
        signerPubKey: '0xabcdef1234567890abcdef1234567890abcdef12',
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
        totalBonusUsd: '10000000',
        signerPubKey: '0xfc128652c9b397a1f89A9EC84E798B869B0E4c7a',
        // Unauthorizing is signed locally, so the Manage story needs the signer key
        // for the Signer Key card to offer it.
        signerPrvKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
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

export function HistoryTabStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-history-tab"
      adapterFactory={createAdapterFactory('quote_ready', {
        totalCreditUsd: '110000000',
        totalBonusUsd: '10000000',
        signerPubKey: '0xfc128652c9b397a1f89A9EC84E798B869B0E4c7a',
        operatorConsented: true,
        operatorAddress: '0x0000000000000000000000000000000000000004',
        totalGdDepositedG: '50.00',
        monthlyStreamG: '5.00',
        gBalance: '42.50',
        activeTab: 'history',
      })}
    />
  )
}

export function SetupTabStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-setup-tab"
      adapterFactory={createAdapterFactory('purchase_setup', {
        gBalance: '42.50',
        activeTab: 'setup',
      })}
    />
  )
}

export function SignerKeyGeneratedStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-signer-key-generated"
      adapterFactory={createAdapterFactory('purchase_setup', {
        activeTab: 'setup',
        signerPubKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        signerPrvKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      })}
    />
  )
}

/** Setup tab with a generated signer key and the Authorize Credits Management step ready. */
export function SetupAuthorizeWalletStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-setup-authorize-wallet"
      adapterFactory={createAdapterFactory('purchase_setup', {
        activeTab: 'setup',
        signerPubKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        signerPrvKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      })}
    />
  )
}

export function SignerKeyIncompatibleOperatorStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-signer-key-incompatible"
      adapterFactory={createAdapterFactory('purchase_setup', {
        activeTab: 'setup',
        signerPubKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        signerPrvKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        operatorAddress: '0x0000000000000000000000000000000000000004',
        currentOperator: '0x0000000000000000000000000000000000000005',
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

export function BuyTabErrorStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-buy-tab-error"
      adapterFactory={createAdapterFactory('quote_ready', {
        signerPubKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        operatorConsented: true,
        error: 'Network request failed. Please try again.',
      })}
    />
  )
}

export function PaymentFailedStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-payment-failed"
      adapterFactory={createAdapterFactory('payment_failed', {
        signerPubKey: '0xabcdef1234567890abcdef1234567890abcdef12',
        operatorConsented: true,
        error: 'Payment failed. Try again.',
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
      <MockAiCreditsWidget provider={injectedProvider} showWalletControls />
    </YStack>
  )
}

/**
 * Inner component that calls useAppKit() – must be rendered inside DefaultAppKitProvider.
 * Passes the AppKit open() as connectOverride so Connect Wallet triggers the real modal.
 */
function AppKitConnectShell() {
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()
  const { address: appKitAddress, status: accountStatus } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<EIP1193Provider | undefined>('eip155')
  const { chainId, switchNetwork, approvedCaipNetworkIds } = useAppKitNetwork()
  const appKitAddressRef = useRef(appKitAddress)
  appKitAddressRef.current = appKitAddress

  // Mirrors apps/ai-credits-web so the story exercises the same wallet wiring
  // real users hit — without these, a WalletConnect wallet that ignores
  // wallet_switchEthereumChain has no fallback and no reliable chain reading.
  const isAccountResolved = accountStatus === 'connected' || accountStatus === 'disconnected'
  const appKitNetworksByChainId = useMemo(
    () => new Map(DEFAULT_APPKIT_NETWORKS.map((network) => [Number(network.id), network])),
    [],
  )
  const availableChainIds = useMemo(
    () =>
      approvedCaipNetworkIds
        ? approvedCaipNetworkIds
            .map((caipId) => Number(caipId.split(':')[1]))
            .filter((id) => Number.isFinite(id))
        : null,
    [approvedCaipNetworkIds],
  )
  const backendUrl = import.meta.env.VITE_AI_CREDITS_BACKEND_URL
  const baseRpcUrl = import.meta.env.VITE_AI_CREDITS_BASE_RPC_URL
  const celoRpcUrl = import.meta.env.VITE_AI_CREDITS_CELO_RPC_URL
  const fundingVaultAddress = import.meta.env.VITE_AI_CREDITS_FUNDING_VAULT_ADDRESS as
    | `0x${string}`
    | undefined
  const vaultAddress = import.meta.env.VITE_AI_CREDITS_VAULT_ADDRESS as `0x${string}` | undefined
  const goodIdAddress = import.meta.env.VITE_AI_CREDITS_GOODID_ADDRESS as `0x${string}` | undefined

  return (
    // Plain div, not a Tamagui stack: this Showcase meta disables the shared
    // provider, so the widget brings its own theme context and anything wrapping
    // it has none.
    <div data-testid="AiCreditsWidget-appkit-connect" style={{ width: 380 }}>
      <AiCreditsWidget
        provider={walletProvider}
        connectOverride={async () => {
          await open({ view: 'Connect' })

          if (!appKitAddressRef.current) {
            throw new Error('wallet_connect_cancelled')
          }
        }}
        showWalletControls
        disconnectOverride={async () => {
          await disconnect()
        }}
        addressOverride={isAccountResolved ? (appKitAddress ?? null) : undefined}
        chainIdOverride={isAccountResolved ? (chainId == null ? null : Number(chainId)) : undefined}
        availableChainIdsOverride={availableChainIds}
        switchChainOverride={async (targetChainId) => {
          const targetNetwork = appKitNetworksByChainId.get(targetChainId)
          // Opening the modal is not proof of a switch, so this throws rather
          // than resolves — the caller must not treat it as done.
          if (!targetNetwork) {
            await open({ view: 'Networks' })
            throw new Error('Select the network in the wallet dialog, then try again.')
          }
          try {
            await switchNetwork(targetNetwork)
          } catch {
            await open({ view: 'Networks' })
            throw new Error('Select the network in the wallet dialog, then try again.')
          }
        }}
        backendUrl={backendUrl}
        baseRpcUrl={baseRpcUrl}
        celoRpcUrl={celoRpcUrl}
        fundingVaultAddress={fundingVaultAddress}
        vaultAddress={vaultAddress}
        goodIdAddress={goodIdAddress}
      />
    </div>
  )
}

/**
 * Story that mounts AiCreditsWidget with DefaultAppKitProvider as the wallet provider.
 * Pressing Connect Wallet triggers the real AppKit modal via the provider-level connect override.
 * Requires VITE_REOWN_PROJECT_ID to be set in examples/storybook/.env.local.
 */
export function AppKitConnectWalletStory() {
  const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string | undefined

  if (!projectId) {
    return (
      <div data-testid="AiCreditsWidget-appkit-no-config" style={{ width: 380 }}>
        <strong>AppKit not configured</strong>
        <span>
          Set <code>VITE_REOWN_PROJECT_ID</code> in <code>examples/storybook/.env.local</code> to
          enable AppKit wallet connect.
        </span>
      </div>
    )
  }
  return (
    <DefaultAppKitProvider projectId={projectId}>
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
        showWalletControls
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

// ---------------------------------------------------------------------------
// Multi-signer fixture stories
// ---------------------------------------------------------------------------

const BUYER_WALLET = {
  address: '0xfc128652c9b397a1f89A9EC84E798B869B0E4c7a' as const,
  privateKey: '0x0000000000000000000000000000000000000000000000000000000000000001' as const,
}

const BUYER_IMPORTED = {
  address: '0xAbcDef1234567890AbcDef1234567890AbcDef12' as const,
  privateKey: '0x0000000000000000000000000000000000000000000000000000000000000002' as const,
}

const BUYER_PARTNER = {
  address: '0x1111111111111111111111111111111111111111' as const,
  operatorSignature:
    '0x1111111111111111111111111111111111111111111111111111111111111111222222222222222222222222222222222222222222222222222222222222222200' as const,
}

/** Multi-signer manage: backend address list with one selected signer that has a local key. */
export function MultiSignerManageStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-multi-signer-manage"
      adapterFactory={createAdapterFactory('quote_ready', {
        totalCreditUsd: '110000000',
        totalBonusUsd: '10000000',
        signerPubKey: BUYER_WALLET.address,
        signerPrvKey: BUYER_WALLET.privateKey,
        operatorConsented: true,
        operatorAddress: '0x0000000000000000000000000000000000000004',
        totalGdDepositedG: '50.00',
        monthlyStreamG: '5.00',
        gBalance: '42.50',
        activeTab: 'manage',
        signers: [BUYER_WALLET.address, BUYER_IMPORTED.address, BUYER_PARTNER.address],
        derivedSignerAddress: BUYER_WALLET.address,
      })}
    />
  )
}

/**
 * Standalone/Storybook host: the wallet chip is opted in and the host supplies a
 * disconnect, so the header carries the address and its Disconnect action.
 */
export function WalletControlsStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-wallet-controls"
      showWalletControls
      disconnectOverride={async () => {}}
      adapterFactory={createAdapterFactory('quote_ready', {
        totalCreditUsd: '110000000',
        totalBonusUsd: '10000000',
        signerPubKey: BUYER_WALLET.address,
        signerPrvKey: BUYER_WALLET.privateKey,
        operatorConsented: true,
        gBalance: '42.50',
        activeTab: 'manage',
        signers: [BUYER_WALLET.address],
      })}
    />
  )
}

/**
 * Wallet host: showWalletControls is left at its default, so the header renders
 * exactly as before — no address, no disconnect. The wallet owns the session.
 */
export function WalletControlsHiddenStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-wallet-controls-hidden"
      adapterFactory={createAdapterFactory('quote_ready', {
        totalCreditUsd: '110000000',
        totalBonusUsd: '10000000',
        signerPubKey: BUYER_WALLET.address,
        signerPrvKey: BUYER_WALLET.privateKey,
        operatorConsented: true,
        gBalance: '42.50',
        activeTab: 'manage',
        signers: [BUYER_WALLET.address],
      })}
    />
  )
}

/** Deep-link partner signer: consent uses pre-signed operatorSignature (no private key). */
export function DeepLinkSignerStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-deep-link-signer"
      adapterFactory={createAdapterFactory('purchase_setup', {
        signerPubKey: BUYER_PARTNER.address,
        signerPrvKey: null,
        operatorSignature: BUYER_PARTNER.operatorSignature,
        operatorConsented: false,
        gBalance: '42.50',
        activeTab: 'manage',
        signers: [BUYER_PARTNER.address],
      })}
    />
  )
}

/**
 * Deep-link partner signer reaching the buy-flow consent step: a pre-signed
 * operatorSignature is prefilled but operatorConsented is still false, so the
 * explicit "Sign Operator Consent" gate must render instead of auto-advancing.
 */
export function DeepLinkConsentPendingStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-deep-link-consent-pending"
      adapterFactory={createAdapterFactory('purchase_setup', {
        signerPubKey: BUYER_PARTNER.address,
        signerPrvKey: null,
        operatorSignature: BUYER_PARTNER.operatorSignature,
        operatorConsented: false,
        activeTab: 'buy',
        signers: [BUYER_PARTNER.address],
      })}
    />
  )
}

/** History tab with multi-signer filter options available. */
export function MultiSignerHistoryStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-multi-signer-history"
      adapterFactory={createAdapterFactory('quote_ready', {
        totalCreditUsd: '110000000',
        totalBonusUsd: '10000000',
        signerPubKey: BUYER_WALLET.address,
        signerPrvKey: BUYER_WALLET.privateKey,
        operatorConsented: true,
        gBalance: '42.50',
        activeTab: 'history',
        signers: [BUYER_WALLET.address, BUYER_IMPORTED.address],
        derivedSignerAddress: BUYER_WALLET.address,
      })}
    />
  )
}

/** Buy tab with the guidance card visible (default state). */
export function GuidanceCardDefaultStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-guidance-card"
      adapterFactory={createAdapterFactory('purchase_setup', {
        gBalance: '42.50',
        activeTab: 'buy',
      })}
    />
  )
}

/** Buy tab with the How to use help view open. */
export function GuidanceCardHowToUseStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-guidance-how-to-use"
      adapterFactory={createAdapterFactory('purchase_setup', {
        gBalance: '42.50',
        activeTab: 'buy',
      })}
    />
  )
}

/** Buy tab with the FAQ help view open. */
export function GuidanceCardFaqStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-guidance-faq"
      adapterFactory={createAdapterFactory('purchase_setup', {
        gBalance: '42.50',
        activeTab: 'buy',
      })}
    />
  )
}

/**
 * Setup tab with wallet connected — shows Download AntSeed as the first
 * actionable step with locked subsequent steps until download is started.
 */
export function DownloadAntSeedStepStory() {
  return (
    <MockStoryShell
      dataTestId="AiCreditsWidget-download-antseed-step"
      adapterFactory={createAdapterFactory('purchase_setup', {
        gBalance: '54570',
        activeTab: 'setup',
      })}
    />
  )
}
