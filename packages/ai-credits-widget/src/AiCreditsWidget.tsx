import React, { useCallback, useMemo, useRef, useState } from 'react'
import { GoodWidgetProvider, WalletControls } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  Badge,
  BadgeText,
  Button,
  ButtonText,
  Card,
  CircularActionButton,
  getChainDisplayName,
  GoodWidgetDialog,
  Heading,
  Text,
  ToastContainer,
  WidgetTabs,
  XStack,
  YStack,
  Spinner,
  createToast,
  updateToast,
} from '@goodwidget/ui'
import { version } from '../package.json'
import { WidgetVersion } from '@goodwidget/ui'
import { needsWalletConnection, useAiCreditsAdapter } from './adapter'
import { useAiCreditsHistory } from './useAiCreditsHistory'
import { useApiKey } from './useApiKey'
import {
  AiCreditsHero,
  AiCreditsPurchaseFlow,
  AiCreditsStatusNotice,
  ApiKeyPanel,
  ApiKeyReadySheet,
  FaqView,
  GuidanceCard,
  HistoryTab,
  HowToUseView,
} from './components'
import type { AiCreditsApi } from './aiCreditsApi/types'
import type { ApiKeyActions } from './useApiKey'
import type {
  AiCreditsWidgetProps,
  AiCreditsWidgetEnvironment,
  AiCreditsPaySuccessDetail,
  AiCreditsPayErrorDetail,
  AiCreditsWidgetAdapterFactory,
  AiCreditsWidgetAdapterOptions,
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterState,
  AiCreditsWidgetTab,
  AiCreditsQuote,
} from './widgetRuntimeContract'

const CELO_CHAIN_ID = 42220

interface AiCreditsInnerProps {
  environment?: AiCreditsWidgetEnvironment
  backendUrl?: string
  baseRpcUrl?: string
  celoRpcUrl?: string
  fundingVaultAddress?: string
  vaultAddress?: string
  goodIdAddress?: string
  adapterFactory?: AiCreditsWidgetAdapterFactory
  adapterOptions?: AiCreditsWidgetAdapterOptions
  onPaySuccess?: (detail: AiCreditsPaySuccessDetail) => void
  onPayError?: (detail: AiCreditsPayErrorDetail) => void
  showWalletControls?: boolean
  aiCreditsApi?: AiCreditsApi
}

/** Prompt shown on the Buy tab until a wallet is connected. */
function ConnectPrompt({
  onConnect,
  connecting,
}: {
  onConnect: () => Promise<void>
  connecting: boolean
}) {
  return (
    <YStack gap="$5" alignItems="center" paddingVertical="$6" width="100%">
      <Text tone="soft" center>
        Connect your wallet to get started
      </Text>
      <CircularActionButton
        label={connecting ? 'Connecting...' : 'Connect Wallet'}
        pending={connecting}
        disabled={connecting}
        onPress={() => {
          void onConnect()
        }}
      />
    </YStack>
  )
}

/**
 * Wrong-network prompt.
 *
 * Some wallets — mobile ones bridged over WalletConnect in particular — cannot
 * be switched by the page at all, so this reports what happened instead of
 * leaving a button that silently does nothing, and names the manual route as a
 * fallback.
 */
function SwitchChainNotice({
  actions,
  error,
}: {
  actions: AiCreditsWidgetAdapterActions
  error: string | null
}) {
  const [switching, setSwitching] = useState(false)
  // The stock adapter reports failures through `state.error`, but a custom
  // adapterFactory may just reject. Catching here means neither route ends in
  // an unhandled rejection and a button that appears to do nothing.
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSwitch = useCallback(async () => {
    setSwitching(true)
    setLocalError(null)
    try {
      await actions.switchChain()
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error && err.message
          ? err.message
          : 'Could not switch to Celo. Switch networks in your wallet, then try again.',
      )
    } finally {
      setSwitching(false)
    }
  }, [actions])

  const shownError = error ?? localError

  return (
    <AiCreditsStatusNotice>
      <XStack gap="$2" alignItems="center">
        <Text color="$warning" fontWeight="700">
          Wrong Network
        </Text>
      </XStack>
      <Text tone="soft">Please switch to the Celo network to continue.</Text>
      <Button
        disabled={switching}
        onPress={() => {
          void handleSwitch()
        }}
      >
        {switching ? (
          <XStack gap="$2" alignItems="center">
            <ButtonText>Switching…</ButtonText>
            <Spinner size="sm" />
          </XStack>
        ) : (
          <ButtonText>Switch to Celo</ButtonText>
        )}
      </Button>
      {shownError && (
        <>
          <Text color="$error" fontSize="$2">
            {shownError}
          </Text>
          <Text tone="soft" fontSize="$2">
            Some wallets cannot switch networks from a website. Change the network to Celo in your
            wallet app, then return here.
          </Text>
        </>
      )}
    </AiCreditsStatusNotice>
  )
}

interface BuyPanelProps {
  state: AiCreditsWidgetAdapterState
  actions: AiCreditsWidgetAdapterActions
  isPending: boolean
  /** False when no `aiCreditsApi` is configured, so a purchase could not be turned into a key. */
  isPurchaseAvailable: boolean
  onPay: (quote: AiCreditsQuote) => void
}

function BuyCreditsPanel({ state, actions, isPending, isPurchaseAvailable, onPay }: BuyPanelProps) {
  let content: React.ReactNode

  if (!isPurchaseAvailable) {
    // Paying without a key backend would take real G$ and hand back no key.
    content = (
      <AiCreditsStatusNotice>
        <Text color="$warning" fontWeight="700">
          Buying credits is not available yet
        </Text>
        <Text tone="soft">
          GoodDollar AI credits are not open for purchase yet. Your wallet has not been charged.
        </Text>
      </AiCreditsStatusNotice>
    )
  } else if (state.status === 'unsupported_chain') {
    content = <SwitchChainNotice actions={actions} error={state.error} />
  } else if (state.status === 'payment_failed') {
    content = (
      <>
        <AiCreditsStatusNotice>
          <Text color="$error" fontWeight="700">
            Payment Failed
          </Text>
          {state.error && <Text tone="soft">{state.error}</Text>}
        </AiCreditsStatusNotice>
        <AiCreditsPurchaseFlow
          state={state}
          actions={actions}
          isPending={isPending}
          onPay={onPay}
        />
      </>
    )
  } else if (state.status === 'backend_unavailable') {
    content = (
      <AiCreditsStatusNotice>
        <Text color="$warning" fontWeight="700">
          Service Unavailable
        </Text>
        <Text tone="soft">
          The AI credits service is temporarily unavailable. Your wallet has not been charged.
        </Text>
        <Button
          onPress={() => {
            void actions.retry()
          }}
        >
          <ButtonText>Retry</ButtonText>
        </Button>
      </AiCreditsStatusNotice>
    )
  } else if (state.status === 'insufficient_g_balance') {
    content = (
      <>
        <AiCreditsHero gBalance={state.gBalance} isGoodIdVerified={state.isGoodIdVerified} />
        <AiCreditsStatusNotice>
          <Text color="$warning" fontWeight="700">
            Insufficient G$ Balance
          </Text>
          <Text tone="soft">
            You need at least 1 G$ to purchase AI credits. Top up your wallet and try again.
          </Text>
        </AiCreditsStatusNotice>
      </>
    )
  } else if (state.status === 'payment_pending' || state.status === 'payment_confirmed') {
    const message =
      state.status === 'payment_pending'
        ? 'Transaction submitted — waiting for confirmation…'
        : 'Payment confirmed — adding your GoodDollar AI credits…'

    content = (
      <Card>
        <YStack gap="$4" alignItems="center" padding="$4">
          <Spinner size="lg" />
          <Text center tone="soft">
            {message}
          </Text>
        </YStack>
      </Card>
    )
  } else {
    content = (
      <>
        {state.address && (
          <AiCreditsHero gBalance={state.gBalance} isGoodIdVerified={state.isGoodIdVerified} />
        )}

        {state.error && (
          <AiCreditsStatusNotice>
            <Text color="$error" fontWeight="700">
              Request Failed
            </Text>
            <Text tone="soft">{state.error}</Text>
          </AiCreditsStatusNotice>
        )}

        {state.gBalance !== null && Number.parseFloat(state.gBalance) <= 0 && (
          <AiCreditsStatusNotice>
            <Text tone="soft">You need G$ before you can buy AI credits.</Text>
          </AiCreditsStatusNotice>
        )}

        <AiCreditsPurchaseFlow
          state={state}
          actions={actions}
          isPending={isPending}
          onPay={onPay}
        />
      </>
    )
  }

  return <YStack gap="$4">{content}</YStack>
}

function AiCreditsInner({
  environment,
  backendUrl,
  baseRpcUrl,
  celoRpcUrl,
  fundingVaultAddress,
  vaultAddress,
  goodIdAddress,
  adapterFactory,
  adapterOptions,
  onPaySuccess,
  onPayError,
  showWalletControls = false,
  aiCreditsApi,
}: AiCreditsInnerProps) {
  // The adapter needs the success callback before `useApiKey` exists, so it reaches the hook through a ref.
  const fulfillPurchaseRef = useRef<ApiKeyActions['fulfillPurchase'] | null>(null)
  const handlePaySuccess = useCallback(
    (detail: AiCreditsPaySuccessDetail) => {
      void fulfillPurchaseRef.current?.({
        accountId: detail.address,
        creditUsdMicro: detail.creditUsdMicro,
        transactionHash: detail.transactionHash,
      })
      onPaySuccess?.(detail)
    },
    [onPaySuccess],
  )

  const defaultAdapter = useAiCreditsAdapter({
    environment,
    backendUrl,
    baseRpcUrl,
    celoRpcUrl,
    fundingVaultAddress: fundingVaultAddress as `0x${string}` | undefined,
    vaultAddress: vaultAddress as `0x${string}` | undefined,
    goodIdAddress: goodIdAddress as `0x${string}` | undefined,
    onPaySuccess: handlePaySuccess,
    onPayError,
    backendClient: adapterOptions?.backendClient,
    chainClient: adapterOptions?.chainClient,
    skipVaultPaymentValidation: adapterOptions?.skipVaultPaymentValidation,
    prepareSettlement: adapterOptions?.prepareSettlement,
  })

  const factoryAdapter = useMemo(
    () => (adapterFactory ? adapterFactory({ environment, backendUrl }) : null),
    [adapterFactory, environment, backendUrl],
  )
  const activeAdapter = factoryAdapter ?? defaultAdapter

  const { state, actions } = activeAdapter

  const apiKey = useApiKey({ aiCreditsApi, accountId: state.address })
  fulfillPurchaseRef.current = apiKey.actions.fulfillPurchase

  const history = useAiCreditsHistory({
    address: state.address,
    backendUrl,
    environment,
    backendClient: adapterOptions?.backendClient,
  })

  const handlePay = useCallback(
    async (quote: AiCreditsQuote) => {
      const toastId = createToast({
        message: 'Submitting Celo transaction…',
        status: 'pending',
        duration: 0,
      })

      try {
        await actions.pay(quote)
        updateToast(toastId, {
          message: 'Credits added successfully!',
          status: 'success',
          duration: 4000,
        })
      } catch (err) {
        updateToast(toastId, {
          message:
            err instanceof Error ? err.message : (state.error ?? 'Payment failed. Try again.'),
          status: 'error',
          duration: 4000,
        })
      }
    },
    [actions, state.error],
  )

  const [helpView, setHelpView] = useState<'how-to-use' | 'faq' | null>(null)

  const isKeyManagementAvailable = !!aiCreditsApi

  const isPending = state.status === 'payment_pending' || state.status === 'payment_confirmed'

  const handleTabChange = useCallback(
    (tabId: string) => {
      setHelpView(null)
      actions.setActiveTab(tabId as AiCreditsWidgetTab)
    },
    [actions],
  )

  // Ending the session leaves every other tab showing empty rows, so the widget
  // returns to Buy Credits — the only tab that has something to say while disconnected.
  const handleDisconnected = useCallback(() => {
    setHelpView(null)
    actions.setActiveTab('buy')
  }, [actions])

  const walletRequired = needsWalletConnection(state)

  const handleHelpViewOpen = useCallback((view: 'how-to-use' | 'faq') => {
    setHelpView(view)
  }, [])

  const handleBuyCredits = useCallback(() => {
    setHelpView(null)
    actions.setActiveTab('buy')
  }, [actions])

  const handleHelpViewClose = useCallback(() => {
    setHelpView(null)
  }, [])

  let tabContent: React.ReactNode
  if (helpView === 'how-to-use') {
    tabContent = <HowToUseView onBack={handleHelpViewClose} />
  } else if (helpView === 'faq') {
    tabContent = <FaqView onBack={handleHelpViewClose} />
  } else if (walletRequired) {
    tabContent = <ConnectPrompt onConnect={actions.connect} connecting={state.status === 'connecting'} />
  } else if (state.activeTab === 'apiKey') {
    tabContent = (
      <ApiKeyPanel
        state={state}
        actions={actions}
        apiKeyState={apiKey.state}
        apiKeyActions={apiKey.actions}
        isKeyManagementAvailable={isKeyManagementAvailable}
        onBuyCredits={handleBuyCredits}
      />
    )
  } else if (state.activeTab === 'history') {
    tabContent = <HistoryTab state={history.state} actions={history.actions} />
  } else {
    tabContent = (
      <BuyCreditsPanel
        state={state}
        actions={actions}
        isPending={isPending}
        isPurchaseAvailable={isKeyManagementAvailable}
        onPay={(quote) => {
          void handlePay(quote)
        }}
      />
    )
  }

  return (
    <YStack gap="$2" padding="$3" width="100%">
      <XStack justifyContent="space-between" alignItems="center" gap="$2" paddingHorizontal="$1">
        <Heading level={4}>GoodDollar</Heading>
        <XStack gap="$2" alignItems="center" flexShrink={1} minWidth={0}>
          <Badge type="info">
            <BadgeText>{getChainDisplayName(state.chainId ?? CELO_CHAIN_ID)}</BadgeText>
          </Badge>
          {showWalletControls && <WalletControls size="sm" onDisconnected={handleDisconnected} />}
        </XStack>
      </XStack>
      <GuidanceCard
        activeHelpView={helpView}
        onHowToUse={() => {
          handleHelpViewOpen('how-to-use')
        }}
        onFaq={() => {
          handleHelpViewOpen('faq')
        }}
        depositBonusPercent={state.depositBonusPercent}
        streamBonusPercent={state.streamBonusPercent}
        isGoodIdVerified={state.isGoodIdVerified}
      />
      <WidgetTabs
        tabs={[
          { id: 'buy', label: 'Buy Credits' },
          { id: 'apiKey', label: 'API Key' },
          { id: 'history', label: 'History' },
        ]}
        activeTab={walletRequired ? 'buy' : state.activeTab}
        onTabChange={handleTabChange}
        isTabDisabled={(tabId) => walletRequired && tabId !== 'buy'}
        withConnectionStatus={false}
      />

      {tabContent}

      <ApiKeyReadySheet
        fullKey={apiKey.state.revealedKey}
        baseUrl={apiKey.state.account?.baseUrl ?? ''}
        onDismiss={apiKey.actions.dismissRevealedKey}
      />
    </YStack>
  )
}

export function AiCreditsWidget({
  provider,
  connectOverride,
  showWalletControls = false,
  disconnectOverride,
  disconnectLabel,
  disconnectIcon,
  addressOverride,
  chainIdOverride,
  switchChainOverride,
  availableChainIdsOverride,
  environment = 'production',
  backendUrl,
  baseRpcUrl,
  celoRpcUrl,
  fundingVaultAddress,
  vaultAddress,
  goodIdAddress,
  themeOverrides,
  config,
  defaultTheme = 'dark',
  onPaySuccess,
  onPayError,
  adapterFactory,
  adapterOptions,
  aiCreditsApi,
  testId,
}: AiCreditsWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
      connectOverride={connectOverride}
      disconnectOverride={disconnectOverride}
      disconnectLabel={disconnectLabel}
      disconnectIcon={disconnectIcon}
      addressOverride={addressOverride}
      chainIdOverride={chainIdOverride}
      switchChainOverride={switchChainOverride}
      availableChainIdsOverride={availableChainIdsOverride}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <YStack backgroundColor="$background" width="100%" data-testid={testId}>
        <AiCreditsInner
          environment={environment}
          backendUrl={backendUrl}
          baseRpcUrl={baseRpcUrl}
          celoRpcUrl={celoRpcUrl}
          fundingVaultAddress={fundingVaultAddress}
          vaultAddress={vaultAddress}
          goodIdAddress={goodIdAddress}
          adapterFactory={adapterFactory}
          adapterOptions={adapterOptions}
          onPaySuccess={onPaySuccess}
          onPayError={onPayError}
          showWalletControls={showWalletControls}
          aiCreditsApi={aiCreditsApi}
        />
        <ToastContainer />
        <GoodWidgetDialog />
        <WidgetVersion name="AI Credits" version={version} />
      </YStack>
    </GoodWidgetProvider>
  )
}
