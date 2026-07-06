import React, { useCallback, useMemo } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  Button,
  ButtonText,
  Card,
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
  AiCreditsStatusNotice,
  AmountPicker,
  BuyerKeyPanel,
  OperatorConsentStep,
  CreditsManagementCard,
  BuyerOperatorCard,
  SetupSnippet,
  UsageLog,
} from './aiCreditsComponents'
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

const CELO_CHAIN_ID = 42220

interface AiCreditsInnerProps {
  environment?: AiCreditsWidgetEnvironment
  backendUrl?: string
  baseRpcUrl?: string
  fundingVaultAddress?: string
  vaultAddress?: string
  adapterFactory?: AiCreditsWidgetAdapterFactory
  onPaySuccess?: (detail: AiCreditsPaySuccessDetail) => void
  onPayError?: (detail: AiCreditsPayErrorDetail) => void
}

interface BuyPanelProps {
  state: AiCreditsWidgetAdapterState
  actions: AiCreditsWidgetAdapterActions
  canPay: boolean
  payDisabledMessage: string | null
  isPending: boolean
  onPay: () => Promise<void>
  onPrimaryAction: () => Promise<void>
}

function BuyCreditsPanel({
  state,
  actions,
  canPay,
  payDisabledMessage,
  isPending,
  onPay,
  onPrimaryAction,
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
        <AiCreditsFlowStepper state={state} />
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

      <AiCreditsFlowStepper state={state} />

      {state.address && !state.buyerKey && !state.operatorConsentSigned && (
        <BuyerKeyPanel
          buyerKey={null}
          buyerKeyPrivate={null}
          buyerKeyConfirmed={false}
          onGenerate={actions.generateBuyerKey}
          onConfirm={actions.confirmBuyerKey}
        />
      )}

      {state.buyerKey && !state.buyerKeyConfirmed && !state.operatorConsentSigned && (
        <BuyerKeyPanel
          buyerKey={state.buyerKey}
          buyerKeyPrivate={state.buyerKeyPrivate ?? null}
          buyerKeyConfirmed={state.buyerKeyConfirmed}
          onGenerate={actions.generateBuyerKey}
          onConfirm={actions.confirmBuyerKey}
        />
      )}

      {state.buyerKey && state.buyerKeyConfirmed && !state.operatorConsentSigned && (
        <OperatorConsentStep
          buyerKey={state.buyerKey}
          buyerKeyPrivate={state.buyerKeyPrivate ?? null}
          operatorConsentSigned={state.operatorConsentSigned}
          onSign={actions.signOperatorConsent}
        />
      )}

      {state.operatorConsentSigned && (
        <AmountPicker
          depositAmount={state.depositAmount}
          streamAmount={state.streamAmount}
          gBalance={state.gBalance}
          minDepositG={state.minDepositG}
          minStreamG={state.minStreamG}
          quote={state.quote}
          canPay={canPay}
          payDisabledMessage={payDisabledMessage}
          isPayPending={isPending}
          onDepositChange={actions.setDepositAmount}
          onStreamChange={actions.setStreamAmount}
          onPay={() => {
            void onPay()
          }}
        />
      )}

      {!state.operatorConsentSigned &&
        state.primaryAction !== 'none' &&
        state.primaryAction !== 'generate_key' &&
        state.primaryAction !== 'sign_consent' && (
          <Button
            fullWidth
            disabled={isPending}
            onPress={() => {
              void onPrimaryAction()
            }}
          >
            {isPending ? (
              <XStack gap="$2" alignItems="center">
                <ButtonText>{state.primaryLabel}</ButtonText>
                <Spinner size="sm" />
              </XStack>
            ) : (
              <ButtonText>{state.primaryLabel}</ButtonText>
            )}
          </Button>
        )}
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
    <YStack gap="$4">
      {state.error && (
        <AiCreditsStatusNotice>
          <Text color="$error" fontSize="$2">
            {state.error}
          </Text>
        </AiCreditsStatusNotice>
      )}

      <CreditsManagementCard state={state} actions={actions} />

      <BuyerOperatorCard state={state} actions={actions} />

      {state.setupSnippet && <SetupSnippet snippet={state.setupSnippet} />}

      <UsageLog entries={state.usageLog} />

      <Button
        variant="ghost"
        onPress={() => {
          void actions.refresh()
        }}
      >
        <ButtonText>Refresh Balance</ButtonText>
      </Button>
    </YStack>
  )
}

function AiCreditsInner({
  environment,
  backendUrl,
  baseRpcUrl,
  fundingVaultAddress,
  vaultAddress,
  adapterFactory,
  onPaySuccess,
  onPayError,
}: AiCreditsInnerProps) {
  const defaultAdapter = useAiCreditsAdapter({
    environment,
    backendUrl,
    baseRpcUrl,
    fundingVaultAddress: fundingVaultAddress as `0x${string}` | undefined,
    vaultAddress: vaultAddress as `0x${string}` | undefined,
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
        message: 'Payment submitted! Waiting for credits…',
        status: 'success',
        duration: 4000,
      })
    } catch {
      updateToast(toastId, {
        message: state.error ?? 'Payment failed',
        status: 'error',
        duration: 0,
      })
    }
  }, [actions, state.error])

  const handlePrimaryAction = useCallback(async () => {
    switch (state.primaryAction) {
      case 'connect':
        await actions.connect()
        break
      case 'switch_chain':
        await actions.switchChain()
        break
      case 'generate_key':
        await actions.generateBuyerKey()
        break
      case 'sign_consent':
        await actions.signOperatorConsent()
        break
      case 'pay':
        await handlePay()
        break
      case 'retry':
        await actions.retry()
        break
      case 'refresh':
        await actions.refresh()
        break
      default:
        break
    }
  }, [state.primaryAction, actions, handlePay])

  const isPending =
    state.status === 'payment_pending' || state.status === 'payment_confirmed'

  const showTabs = Boolean(state.address)

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
      onPay={handlePay}
      onPrimaryAction={handlePrimaryAction}
    />
  )

  if (!showTabs) {
    return (
      <YStack gap="$4" padding="$4">
        <AiCreditsFlowStepper state={state} />
        {state.primaryAction === 'connect' && (
          <Button
            fullWidth
            onPress={() => {
              void handlePrimaryAction()
            }}
          >
            <ButtonText>{state.primaryLabel}</ButtonText>
          </Button>
        )}
      </YStack>
    )
  }

  return (
    <YStack gap="$4" padding="$4">
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
  fundingVaultAddress,
  vaultAddress,
  themeOverrides,
  config,
  defaultTheme = 'dark',
  onPaySuccess,
  onPayError,
  adapterFactory,
}: AiCreditsWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider as EIP1193Provider | undefined}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <AiCreditsInner
        environment={environment}
        backendUrl={backendUrl}
        baseRpcUrl={baseRpcUrl}
        fundingVaultAddress={fundingVaultAddress}
        vaultAddress={vaultAddress}
        adapterFactory={adapterFactory}
        onPaySuccess={onPaySuccess}
        onPayError={onPayError}
      />
      <ToastContainer />
    </GoodWidgetProvider>
  )
}
