import React, { useCallback, useMemo } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  Button,
  ButtonText,
  Card,
  CircularActionButton,
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
import { useAiCreditsAdapter } from './adapter'
import {
  AiCreditsHero,
  AiCreditsFlowStepper,
  AiCreditsPurchaseFlow,
  AiCreditsStatusNotice,
  CreditsManagementCard,
  BuyerOperatorCard,
  SetupSnippet,
  UsageLog,
} from './components'
import type {
  AiCreditsWidgetProps,
  AiCreditsWidgetEnvironment,
  AiCreditsPaySuccessDetail,
  AiCreditsPayErrorDetail,
  AiCreditsWidgetAdapterFactory,
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterState,
  AiCreditsWidgetTab,
} from './widgetRuntimeContract'
import { getPaymentAmountValidation, getPayDisabledMessage } from './vaultMinimums'
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
  onPaySuccess?: (detail: AiCreditsPaySuccessDetail) => void
  onPayError?: (detail: AiCreditsPayErrorDetail) => void
}

function DisconnectedPanel({
  onConnect,
}: {
  onConnect: () => Promise<void>
}) {
  return (
    <Card>
      <YStack gap="$5" paddingVertical="$6" alignItems="center">
        <Text secondary>Connect your wallet to buy AI credits</Text>
        <CircularActionButton
          label="Connect Wallet"
          onPress={() => {
            void onConnect()
          }}
        />
      </YStack>
    </Card>
  )
}

interface BuyPanelProps {
  state: AiCreditsWidgetAdapterState
  actions: AiCreditsWidgetAdapterActions
  canPay: boolean
  payDisabledMessage: string | null
  isPending: boolean
  onPay: () => void
}

function BuyCreditsPanel({
  state,
  actions,
  canPay,
  payDisabledMessage,
  isPending,
  onPay,
}: BuyPanelProps) {
  if (state.status === 'unsupported_chain') {
    return (
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
  }

  if (state.status === 'payment_failed') {
    return (
      <YStack gap="$4">
        <AiCreditsStatusNotice>
          <Text color="$error" fontWeight="700">
            Payment Failed
          </Text>
          {state.error && <Text secondary>{state.error}</Text>}
          <Button
            onPress={() => {
              void actions.retry()
            }}
          >
            <ButtonText>Try Again</ButtonText>
          </Button>
        </AiCreditsStatusNotice>
        <AiCreditsPurchaseFlow
          state={state}
          actions={actions}
          canPay={canPay}
          payDisabledMessage={payDisabledMessage}
          isPending={isPending}
          onPay={onPay}
        />
      </YStack>
    )
  }

  if (state.status === 'backend_unavailable') {
    return (
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
  }

  if (state.status === 'insufficient_g_balance') {
    return (
      <YStack gap="$4">
        <AiCreditsHero
          gBalance={state.gBalance}
          isGoodIdVerified={state.isGoodIdVerified}
          bonusPercent={state.bonusPercent}
        />
        <AiCreditsStatusNotice>
          <Text color="$warning" fontWeight="700">
            Insufficient G$ Balance
          </Text>
          <Text secondary>
            You need at least 1 G$ to purchase AI credits. Top up your wallet and try again.
          </Text>
        </AiCreditsStatusNotice>
      </YStack>
    )
  }

  if (state.status === 'payment_pending' || state.status === 'payment_confirmed') {
    const message =
      state.status === 'payment_pending'
        ? 'Transaction submitted — waiting for confirmation…'
        : 'Payment confirmed — settling credits on Base…'

    return (
      <YStack gap="$4">
        <Card>
          <YStack gap="$4" alignItems="center" padding="$4">
            <Spinner size="lg" />
            <Text center secondary>
              {message}
            </Text>
          </YStack>
        </Card>
        <AiCreditsFlowStepper state={state} />
      </YStack>
    )
  }

  return (
    <YStack gap="$4">
      {state.address && (
        <AiCreditsHero
          gBalance={state.gBalance}
          isGoodIdVerified={state.isGoodIdVerified}
          bonusPercent={state.bonusPercent}
        />
      )}

      {state.gBalance !== null && Number.parseFloat(state.gBalance) <= 0 && (
        <AiCreditsStatusNotice>
          <Text secondary>You need G$ before you can buy AI credits.</Text>
        </AiCreditsStatusNotice>
      )}

      <AiCreditsPurchaseFlow
        state={state}
        actions={actions}
        canPay={canPay}
        payDisabledMessage={payDisabledMessage}
        isPending={isPending}
        onPay={onPay}
      />
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

      <SetupSnippet snippet={state.setupSnippet} />

      <UsageLog entries={state.usageLog} />

      <Button
        variant="ghost"
        size="sm"
        alignSelf="center"
        gap="$2"
        {...compactButtonProps}
        onPress={() => {
          void actions.refresh()
        }}
      >
        <Icon name="refresh" size="sm" color="primary" />
        <ButtonText>Refresh Balance</ButtonText>
      </Button>
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
  })

  const activeAdapter = useMemo(
    () =>
      adapterFactory
        ? adapterFactory({ environment, backendUrl })
        : defaultAdapter,
    [adapterFactory, environment, backendUrl, defaultAdapter],
  )

  const { state, actions } = activeAdapter

  const paymentValidation = useMemo(
    () =>
      getPaymentAmountValidation({
        depositAmount: state.depositAmount,
        streamAmount: state.streamAmount,
        minDepositG: state.minDepositG,
        minStreamG: state.minStreamG,
        gBalance: state.gBalance,
      }),
    [
      state.depositAmount,
      state.streamAmount,
      state.minDepositG,
      state.minStreamG,
      state.gBalance,
    ],
  )

  const minsLoaded = state.minDepositG !== null && state.minStreamG !== null
  const canPay =
    state.status === 'quote_ready' &&
    minsLoaded &&
    paymentValidation.vaultMinimumsMet &&
    !paymentValidation.overBalance

  const payDisabledMessage = getPayDisabledMessage({
    canPay,
    minsLoaded,
    status: state.status,
    minDepositG: state.minDepositG,
    minStreamG: state.minStreamG,
    validation: paymentValidation,
  })

  const handlePay = useCallback(async () => {
    const toastId = createToast({
      message: 'Submitting Celo transaction…',
      status: 'pending',
      duration: 0,
    })

    try {
      await actions.pay()
      updateToast(toastId, {
        message: 'Credits added successfully!',
        status: 'success',
        duration: 4000,
      })
    } catch (err) {
      updateToast(toastId, {
        message: err instanceof Error ? err.message : (state.error ?? 'Payment failed'),
        status: 'error',
        duration: 0,
      })
    }
  }, [actions, state.error])

  const isPending =
    state.status === 'payment_pending' || state.status === 'payment_confirmed'

  const handleTabChange = useCallback(
    (tabId: string) => {
      actions.setActiveTab(tabId as AiCreditsWidgetTab)
    },
    [actions],
  )

  const buyPanel = (
    <BuyCreditsPanel
      state={state}
      actions={actions}
      canPay={canPay}
      payDisabledMessage={payDisabledMessage}
      isPending={isPending}
      onPay={() => {
        void handlePay()
      }}
    />
  )

  if (state.status === 'disconnected') {
    return (
      <YStack gap="$3" padding="$3" width="100%">
        <DisconnectedPanel onConnect={actions.connect} />
      </YStack>
    )
  }

  return (
    <YStack gap="$3" padding="$3" width="100%">
      <WidgetTabs
        tabs={[
          { id: 'buy', label: 'Buy Credits' },
          { id: 'manage', label: 'Manage' },
        ]}
        activeTab={state.activeTab}
        onTabChange={handleTabChange}
        chainId={state.chainId ?? CELO_CHAIN_ID}
      />
      {state.activeTab === 'manage' ? (
        <ManagePanel state={state} actions={actions} />
      ) : (
        buyPanel
      )}
    </YStack>
  )
}

export function AiCreditsWidget({
  provider,
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
  testId,
}: AiCreditsWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
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
          onPaySuccess={onPaySuccess}
          onPayError={onPayError}
        />
        <ToastContainer />
      </YStack>
    </GoodWidgetProvider>
  )
}
