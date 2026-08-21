import React, { useCallback, useMemo, useState } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  Badge,
  BadgeText,
  Button,
  ButtonText,
  Card,
  CircularActionButton,
  getChainDisplayName,
  Heading,
  Icon,
  Text,
  ToastContainer,
  WidgetTabs,
  XStack,
  YStack,
  Spinner,
  createToast,
  updateToast,
} from '@goodwidget/ui'
import { needsWalletConnection, useAiCreditsAdapter } from './adapter'
import { useAiCreditsHistory } from './useAiCreditsHistory'
import {
  AiCreditsHero,
  AiCreditsFlowStepper,
  AiCreditsPurchaseFlow,
  BuyCreditsFaq,
  AiCreditsStatusNotice,
  CreditsManagementCard,
  BuyerOperatorCard,
  SetupSnippet,
  HistoryTab,
  SetupGuidanceCard,
  HowToUseView,
  SetupFaqView,
  DownloadAntSeedStep,
  SignerKeyPanel,
} from './components'
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
import { compactButtonProps } from './components/shared/styles'

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
}

function SetupConnectPrompt({
  onConnect,
  connecting,
}: {
  onConnect: () => Promise<void>
  connecting: boolean
}) {
  return (
    <YStack gap="$5" alignItems="center" paddingVertical="$6" width="100%">
      <Text secondary center>
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


function SetupTabPanel({
  state,
  actions,
  onConnect,
}: {
  state: AiCreditsWidgetAdapterState
  actions: AiCreditsWidgetAdapterActions
  onConnect: () => Promise<void>
}) {
  if (needsWalletConnection(state)) {
    return (
      <SetupConnectPrompt
        onConnect={onConnect}
        connecting={state.status === 'connecting'}
      />
    )
  }

  return (
    <YStack gap="$4" width="100%">
      <AiCreditsHero
        gBalance={state.gBalance}
        isGoodIdVerified={state.isGoodIdVerified}
      />
      <Text secondary fontSize="$2">
        One-time setup, in order — each step unlocks the next:
      </Text>
      <DownloadAntSeedStep />
      <SignerKeyPanel state={state} actions={actions} />
    </YStack>
  )
}

interface BuyPanelProps {
  state: AiCreditsWidgetAdapterState
  actions: AiCreditsWidgetAdapterActions
  isPending: boolean
  onPay: (quote: AiCreditsQuote) => void
}

function BuyCreditsPanel({ state, actions, isPending, onPay }: BuyPanelProps) {
  let content: React.ReactNode

  if (state.status === 'unsupported_chain') {
    content = (
      <AiCreditsStatusNotice>
        <XStack gap="$2" alignItems="center">
          <Text color="$warning" fontWeight="700">
            Wrong Network
          </Text>
        </XStack>
        <Text secondary>Please switch to the Celo network to continue.</Text>
        <Button
          onPress={() => {
            void actions.switchChain()
          }}
        >
          <ButtonText>Switch to Celo</ButtonText>
        </Button>
      </AiCreditsStatusNotice>
    )
  } else if (state.status === 'payment_failed') {
    content = (
      <>
        <AiCreditsStatusNotice>
          <Text color="$error" fontWeight="700">
            Payment Failed
          </Text>
          {state.error && <Text secondary>{state.error}</Text>}
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
        <Text secondary>
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
        <AiCreditsHero
          gBalance={state.gBalance}
          isGoodIdVerified={state.isGoodIdVerified}
        />
        <AiCreditsStatusNotice>
          <Text color="$warning" fontWeight="700">
            Insufficient G$ Balance
          </Text>
          <Text secondary>
            You need at least 1 G$ to purchase AI credits. Top up your wallet and try again.
          </Text>
        </AiCreditsStatusNotice>
      </>
    )
  } else if (state.status === 'payment_pending' || state.status === 'payment_confirmed') {
    const message =
      state.status === 'payment_pending'
        ? 'Transaction submitted — waiting for confirmation…'
        : 'Payment confirmed — settling credits on Base…'

    content = (
      <>
        <Card>
          <YStack gap="$4" alignItems="center" padding="$4">
            <Spinner size="lg" />
            <Text center secondary>
              {message}
            </Text>
          </YStack>
        </Card>
        <AiCreditsFlowStepper state={state} buyerPubKeySaved />
      </>
    )
  } else {
    content = (
      <>
        {state.error && (
          <AiCreditsStatusNotice>
            <Text color="$error" fontWeight="700">
              Deep link unavailable
            </Text>
            <Text secondary>{state.error}</Text>
          </AiCreditsStatusNotice>
        )}

        {state.address && (
          <AiCreditsHero
            gBalance={state.gBalance}
            isGoodIdVerified={state.isGoodIdVerified}
          />
        )}

        {state.error && (
          <AiCreditsStatusNotice>
            <Text color="$error" fontWeight="700">
              Request Failed
            </Text>
            <Text secondary>{state.error}</Text>
          </AiCreditsStatusNotice>
        )}

        {state.gBalance !== null && Number.parseFloat(state.gBalance) <= 0 && (
          <AiCreditsStatusNotice>
            <Text secondary>You need G$ before you can buy AI credits.</Text>
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

  return (
    <YStack gap="$4">
      {content}
      <BuyCreditsFaq />
    </YStack>
  )
}

function ManagePanel({
  state,
  actions,
}: {
  state: AiCreditsWidgetAdapterState
  actions: AiCreditsWidgetAdapterActions
}) {
  const [refreshing, setRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await actions.refresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <YStack gap="$3" width="100%">
      {state.error && (
        <AiCreditsStatusNotice>
          <Text color="$error" fontSize="$2">
            {state.error}
          </Text>
        </AiCreditsStatusNotice>
      )}

      <CreditsManagementCard state={state} actions={actions} />

      <BuyerOperatorCard state={state} actions={actions} />

      <SetupSnippet />

      <YStack gap="$2" width="100%" alignItems="center">
        {state.error && (
          <Text color="$error" fontSize="$2" textAlign="center">
            {state.error}
          </Text>
        )}
        <Button
          variant="outline"
          size="sm"
          alignSelf="stretch"
          gap="$2"
          disabled={refreshing}
          {...compactButtonProps}
          onPress={() => {
            void handleRefresh()
          }}
        >
          {refreshing ? <Spinner size="sm" /> : <Icon name="refresh" size="sm" color="muted" />}
          <ButtonText>{refreshing ? 'Refreshing…' : 'Refresh Balance'}</ButtonText>
        </Button>
      </YStack>
    </YStack>
  )
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
}: AiCreditsInnerProps) {
  const defaultAdapter = useAiCreditsAdapter({
    environment,
    backendUrl,
    baseRpcUrl,
    celoRpcUrl,
    fundingVaultAddress: fundingVaultAddress as `0x${string}` | undefined,
    vaultAddress: vaultAddress as `0x${string}` | undefined,
    goodIdAddress: goodIdAddress as `0x${string}` | undefined,
    onPaySuccess,
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
  const onBuyersDiscoveredRef = React.useRef(actions.discoverBuyers)
  onBuyersDiscoveredRef.current = actions.discoverBuyers
  const onBuyersDiscovered = useCallback((addresses: string[]) => {
    onBuyersDiscoveredRef.current(addresses)
  }, [])

  const history = useAiCreditsHistory({
    address: state.address,
    backendUrl,
    defaultBuyerFilter: state.buyerPubKey ?? 'all',
    environment,
    backendClient: adapterOptions?.backendClient,
    onBuyersDiscovered,
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
          message: err instanceof Error ? err.message : (state.error ?? 'Payment failed. Try again.'),
          status: 'error',
          duration: 4000,
        })
      }
    },
    [actions, state.error],
  )

  const [helpView, setHelpView] = useState<'how-to-use' | 'faq' | null>(null)

  const isPending = state.status === 'payment_pending' || state.status === 'payment_confirmed'

  const handleTabChange = useCallback(
    (tabId: string) => {
      if (tabId !== 'setup') {
        setHelpView(null)
      }
      actions.setActiveTab(tabId as AiCreditsWidgetTab)
    },
    [actions],
  )

  const walletRequired = needsWalletConnection(state)

  const handleHelpViewOpen = useCallback(
    (view: 'how-to-use' | 'faq') => {
      actions.setActiveTab('setup')
      setHelpView(view)
    },
    [actions],
  )

  const handleHelpViewClose = useCallback(() => {
    setHelpView(null)
  }, [])

  const setupPanel =
    helpView === 'how-to-use' ? (
      <HowToUseView onBack={handleHelpViewClose} />
    ) : helpView === 'faq' ? (
      <SetupFaqView onBack={handleHelpViewClose} />
    ) : (
      <SetupTabPanel state={state} actions={actions} onConnect={actions.connect} />
    )

  return (
    <YStack gap="$3" padding="$3" width="100%">
      <XStack justifyContent="space-between" alignItems="center" paddingHorizontal="$1">
        <Heading level={4}>GoodDollar</Heading>
        <Badge type="info">
          <BadgeText>{getChainDisplayName(state.chainId ?? CELO_CHAIN_ID)}</BadgeText>
        </Badge>
      </XStack>
      <SetupGuidanceCard
        activeHelpView={helpView}
        onHowToUse={() => { handleHelpViewOpen('how-to-use') }}
        onFaq={() => { handleHelpViewOpen('faq') }}
      />
      <WidgetTabs
        tabs={[
          { id: 'setup', label: 'Setup' },
          { id: 'buy', label: 'Buy Credits' },
          { id: 'manage', label: 'Manage' },
          { id: 'history', label: 'History' },
        ]}
        activeTab={walletRequired ? 'setup' : state.activeTab}
        onTabChange={handleTabChange}
        isTabDisabled={(tabId) => walletRequired && tabId !== 'setup'}
        withConnectionStatus={false}
      />

      {walletRequired || state.activeTab === 'setup' ? (
        setupPanel
      ) : state.activeTab === 'manage' ? (
        <ManagePanel state={state} actions={actions} />
      ) : state.activeTab === 'history' ? (
        <HistoryTab
          state={history.state}
          actions={history.actions}
          knownBuyers={state.buyers.map((address) => ({ address }))}
        />
      ) : (
        <BuyCreditsPanel
          state={state}
          actions={actions}
          isPending={isPending}
          onPay={(quote) => {
            void handlePay(quote)
          }}
        />
      )}
    </YStack>
  )
}

export function AiCreditsWidget({
  provider,
  connectOverride,
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
  testId,
}: AiCreditsWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
      connectOverride={connectOverride}
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
        />
        <ToastContainer />
      </YStack>
    </GoodWidgetProvider>
  )
}
