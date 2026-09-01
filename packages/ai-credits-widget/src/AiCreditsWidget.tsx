import React, { useCallback, useMemo, useState } from 'react'
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
  Heading,
  Icon,
  Text,
  ToastContainer,
  WidgetTabs,
  XStack,
  YStack,
  Spinner,
  createToast,
  GoodWidgetDialog,
  updateToast,
} from '@goodwidget/ui'
import { needsWalletConnection, useAiCreditsAdapter } from './adapter'
import { useAiCreditsHistory } from './useAiCreditsHistory'
import {
  AiCreditsHero,
  AiCreditsPurchaseFlow,
  AiCreditsStatusNotice,
  CreditsManagementCard,
  BuyerOperatorCard,
  SetupSnippet,
  HistoryTab,
  SetupGuidanceCard,
  HowToUseView,
  SetupFaqView,
  SetupOnboardingFlow,
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
  showWalletControls?: boolean
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
    return <SetupConnectPrompt onConnect={onConnect} connecting={state.status === 'connecting'} />
  }

  return (
    <YStack gap="$4" width="100%">
      <AiCreditsHero gBalance={state.gBalance} isGoodIdVerified={state.isGoodIdVerified} />
      <Text tone="soft" fontSize="$2">
        One-time setup — optional for now. Take the steps in any order, or skip ahead and come back
        when you are ready to buy.
      </Text>
      <SetupOnboardingFlow state={state} actions={actions} />
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

/**
 * Standing disclaimer that buying and using credits are different jobs: the
 * purchase works anywhere, but Antseed runs on a desktop, so a phone-only user
 * cannot finish setup or spend what they bought.
 *
 * Collapsed by default to keep it off the top of every panel, but the warning
 * itself stays on the summary line — folding away the sentence that says "you
 * need a computer" would defeat the point of showing it at all. Only the
 * reassuring half, that buying on a phone is fine, is behind the toggle.
 */
function DesktopRequiredNotice() {
  const [expanded, setExpanded] = useState(false)

  return (
    <AiCreditsStatusNotice>
      <XStack
        gap="$2"
        alignItems="flex-start"
        cursor="pointer"
        aria-expanded={expanded}
        onPress={() => setExpanded((prev) => !prev)}
      >
        <Icon name="info" size="sm" color="muted" />
        <Text fontSize="$2" lineHeight="$3" flex={1}>
          <Text fontSize="$2" fontWeight="700">
            Please note:
          </Text>{' '}
          setup requires a computer.
        </Text>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size="xs" color="muted" />
      </XStack>
      {expanded && (
        <Text fontSize="$2" lineHeight="$3" tone="soft" paddingLeft="$6">
          You can buy credits from your phone anytime. Antseed, the app that manages your credits,
          only runs on a desktop.
        </Text>
      )}
    </AiCreditsStatusNotice>
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
        : 'Payment confirmed — settling credits on Base…'

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
        {state.error && (
          <AiCreditsStatusNotice>
            <Text color="$error" fontWeight="700">
              Deep link unavailable
            </Text>
            <Text tone="soft">{state.error}</Text>
          </AiCreditsStatusNotice>
        )}

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

function WidgetDialog() {
  return (
    <GoodWidgetDialog
      renderAccept={(onPress, label) => (
        <Button onPress={onPress}>
          <ButtonText>{label}</ButtonText>
        </Button>
      )}
      renderReject={(onPress, label) => (
        <Button variant="outline" onPress={onPress}>
          <ButtonText>{label}</ButtonText>
        </Button>
      )}
    />
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
  showWalletControls = false,
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

  // Ending the session leaves every other tab showing empty rows, so the widget
  // returns to Setup — the only tab that has something to say while disconnected.
  const handleDisconnected = useCallback(() => {
    setHelpView(null)
    actions.setActiveTab('setup')
  }, [actions])

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
      <XStack justifyContent="space-between" alignItems="center" gap="$2" paddingHorizontal="$1">
        <Heading level={4}>GoodDollar</Heading>
        <XStack gap="$2" alignItems="center" flexShrink={1} minWidth={0}>
          <Badge type="info">
            <BadgeText>{getChainDisplayName(state.chainId ?? CELO_CHAIN_ID)}</BadgeText>
          </Badge>
          {showWalletControls && <WalletControls size="sm" onDisconnected={handleDisconnected} />}
        </XStack>
      </XStack>
      <SetupGuidanceCard
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
          { id: 'setup', label: 'Set Up' },
          { id: 'buy', label: 'Buy Credits' },
          { id: 'manage', label: 'Manage' },
          { id: 'history', label: 'History' },
        ]}
        activeTab={walletRequired ? 'setup' : state.activeTab}
        onTabChange={handleTabChange}
        isTabDisabled={(tabId) => walletRequired && tabId !== 'setup'}
        withConnectionStatus={false}
      />
      <DesktopRequiredNotice />

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
        />
        <WidgetDialog />
        <ToastContainer />
      </YStack>
    </GoodWidgetProvider>
  )
}
