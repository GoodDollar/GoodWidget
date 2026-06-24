import React, { useCallback, useMemo } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  Button,
  ButtonText,
  Card,
  Heading,
  Text,
  ToastContainer,
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
  CreditsBalance,
  SetupSnippet,
  UsageLog,
} from './aiCreditsComponents'
import type {
  AiCreditsWidgetProps,
  AiCreditsWidgetEnvironment,
  AiCreditsPaySuccessDetail,
  AiCreditsPayErrorDetail,
  AiCreditsWidgetAdapterFactory,
} from './widgetRuntimeContract'

// ---------------------------------------------------------------------------
// Inner component — renders inside GoodWidgetProvider
// ---------------------------------------------------------------------------

interface AiCreditsInnerProps {
  environment?: AiCreditsWidgetEnvironment
  backendUrl?: string
  adapterFactory?: AiCreditsWidgetAdapterFactory
  onPaySuccess?: (detail: AiCreditsPaySuccessDetail) => void
  onPayError?: (detail: AiCreditsPayErrorDetail) => void
}

function AiCreditsInner({
  environment,
  backendUrl,
  adapterFactory,
  onPaySuccess,
  onPayError,
}: AiCreditsInnerProps) {
  // Use the injected adapter factory (for Storybook/tests) or the real adapter
  const defaultAdapter = useAiCreditsAdapter({
    environment,
    backendUrl,
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

  // Tracks whether the operator consent sign is in-flight
  const isSigning = state.status === 'payment_pending'

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
        actions.generateBuyerKey()
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

  // ---------------------------------------------------------------------------
  // Render: post-purchase states (has_credits, usage_active, usage_empty)
  // ---------------------------------------------------------------------------

  const isPostPurchase =
    state.status === 'has_credits' ||
    state.status === 'usage_active' ||
    state.status === 'usage_empty'

  if (isPostPurchase) {
    return (
      <YStack gap="$4" padding="$4">
        <CreditsBalance
          aiCreditsBalance={state.aiCreditsBalance}
          setupSnippet={state.setupSnippet}
        />

        {state.setupSnippet && <SetupSnippet snippet={state.setupSnippet} />}

        {state.status === 'usage_empty' && (
          <AiCreditsStatusNotice>
            <Text secondary>Your AI credits are depleted. Purchase more to continue.</Text>
            <Button
              onPress={() => {
                void actions.retry()
              }}
            >
              <ButtonText>Buy More Credits</ButtonText>
            </Button>
          </AiCreditsStatusNotice>
        )}

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

  // ---------------------------------------------------------------------------
  // Render: disconnected state
  // ---------------------------------------------------------------------------

  if (state.status === 'disconnected') {
    return (
      <YStack gap="$4" padding="$4">
        <Card>
          <YStack gap="$4" padding="$4" alignItems="center">
            <Heading level={4} textAlign="center">
              Buy AI Credits with G$
            </Heading>
            <Text secondary center>
              Connect your wallet to purchase AI coding credits on Base using your G$ on Celo.
            </Text>
            <Button
              fullWidth
              onPress={() => {
                void actions.connect()
              }}
            >
              <ButtonText>Connect Wallet</ButtonText>
            </Button>
          </YStack>
        </Card>
      </YStack>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: unsupported chain
  // ---------------------------------------------------------------------------

  if (state.status === 'unsupported_chain') {
    return (
      <YStack gap="$4" padding="$4">
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
      </YStack>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: error states
  // ---------------------------------------------------------------------------

  if (state.status === 'payment_failed') {
    return (
      <YStack gap="$4" padding="$4">
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
      <YStack gap="$4" padding="$4">
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
      </YStack>
    )
  }

  if (state.status === 'insufficient_g_balance') {
    return (
      <YStack gap="$4" padding="$4">
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

  // ---------------------------------------------------------------------------
  // Render: pending payment states
  // ---------------------------------------------------------------------------

  if (state.status === 'payment_pending' || state.status === 'payment_confirmed') {
    const message =
      state.status === 'payment_pending'
        ? 'Transaction submitted — waiting for confirmation…'
        : 'Payment confirmed — settling credits on Base…'

    return (
      <YStack gap="$4" padding="$4">
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

  // ---------------------------------------------------------------------------
  // Render: main connected flow (connected_empty → quote_ready)
  // ---------------------------------------------------------------------------

  return (
    <YStack gap="$4" padding="$4">
      {/* Hero: G$ balance + bonus */}
      <AiCreditsHero
        gBalance={state.gBalance}
        isGoodIdVerified={state.isGoodIdVerified}
        bonusPercent={state.bonusPercent}
      />

      {/* Stepper overview */}
      <AiCreditsFlowStepper state={state} />

      {/* Step panels — shown progressively */}
      {state.address && !state.buyerKey && (
        <BuyerKeyPanel
          buyerKey={null}
          buyerKeyPrivate={null}
          buyerKeyConfirmed={false}
          onGenerate={actions.generateBuyerKey}
          onPaste={actions.pasteBuyerKey}
          onConfirm={actions.confirmBuyerKey}
        />
      )}

      {state.buyerKey && !state.buyerKeyConfirmed && (
        <BuyerKeyPanel
          buyerKey={state.buyerKey}
          buyerKeyPrivate={state.buyerKeyPrivate ?? null}
          buyerKeyConfirmed={state.buyerKeyConfirmed}
          onGenerate={actions.generateBuyerKey}
          onPaste={actions.pasteBuyerKey}
          onConfirm={actions.confirmBuyerKey}
        />
      )}

      {state.buyerKey && state.buyerKeyConfirmed && !state.operatorConsentSigned && (
        <OperatorConsentStep
          buyerKey={state.buyerKey}
          operatorConsentSigned={state.operatorConsentSigned}
          isSigning={isSigning}
          onSign={actions.signOperatorConsent}
        />
      )}

      {state.operatorConsentSigned && (
        <AmountPicker
          depositAmount={state.depositAmount}
          streamAmount={state.streamAmount}
          gBalance={state.gBalance}
          bonusPercent={state.bonusPercent}
          isGoodIdVerified={state.isGoodIdVerified}
          onDepositChange={actions.setDepositAmount}
          onStreamChange={actions.setStreamAmount}
        />
      )}

      {/* Primary action button */}
      {state.primaryAction !== 'none' && state.primaryAction !== 'generate_key' && (
        <Button
          fullWidth
          disabled={isPending}
          onPress={() => {
            void handlePrimaryAction()
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

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

/**
 * AiCreditsWidget — purchase AI coding credits with G$ on Celo.
 *
 * The widget guides the user through:
 *   1. Connect wallet (Celo)
 *   2. Generate or provide a buyer key (real private key, user must save it)
 *   3. Sign backend-issued nonce → receive `gd_live_...` API key
 *   4. Set deposit / stream amounts
 *   5. Submit G$ approve + CeloGdAntSeedVault.deposit (buyer address ABI-encoded)
 *   6. Wait for credit settlement (Worker verifies vault events)
 *   7. View credits balance, setup snippet, and usage log
 *
 * Usage as a React component:
 *   <AiCreditsWidget provider={eip1193Provider} backendUrl="https://api.example.com" />
 *
 * Also available as a Web Component via the `element` or `register` entry points.
 */
export function AiCreditsWidget({
  provider,
  environment = 'production',
  backendUrl,
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
        adapterFactory={adapterFactory}
        onPaySuccess={onPaySuccess}
        onPayError={onPayError}
      />
      <ToastContainer />
    </GoodWidgetProvider>
  )
}
