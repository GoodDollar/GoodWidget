import React, { useState } from 'react'
import {
  createComponent,
  Card,
  Heading,
  Text,
  Button,
  ButtonText,
  XStack,
  YStack,
  Separator,
  Spinner,
  Input,
  Icon,
  TokenAmount,
  Stepper,
} from '@goodwidget/ui'
import type { StepperStepItem } from '@goodwidget/ui'
import type {
  AiCreditsWidgetAdapterState,
  AiCreditsUsageEntry,
} from './widgetRuntimeContract'

// ---------------------------------------------------------------------------
// Named styled components — participate in the component sub-theme system.
// Integrators can override light_AiCreditsHeroCard, dark_AiCreditsHeroCard, etc.
// ---------------------------------------------------------------------------

/** Primary hero card containing G$ input and bonus badge */
export const AiCreditsHeroCard = createComponent(Card, {
  name: 'AiCreditsHeroCard',
  extends: 'Card',
  gap: '$4',
})

/** Panel for buyer key generation and confirmation */
export const BuyerKeyPanelCard = createComponent(Card, {
  name: 'BuyerKeyPanelCard',
  extends: 'Card',
  gap: '$3',
})

/** Operator consent step container */
export const OperatorConsentCard = createComponent(Card, {
  name: 'OperatorConsentCard',
  extends: 'Card',
  gap: '$3',
})

/** Amount picker container for deposit and stream inputs */
export const AmountPickerCard = createComponent(Card, {
  name: 'AmountPickerCard',
  extends: 'Card',
  gap: '$4',
})

/** Credits balance display card */
export const CreditsBalanceCard = createComponent(Card, {
  name: 'CreditsBalanceCard',
  extends: 'Card',
  gap: '$3',
})

/** Copyable setup snippet card */
export const SetupSnippetCard = createComponent(Card, {
  name: 'SetupSnippetCard',
  extends: 'Card',
  gap: '$3',
})

/** Usage log accordion container */
export const UsageLogCard = createComponent(Card, {
  name: 'UsageLogCard',
  extends: 'Card',
  gap: '$2',
})

/** Status notice banner wrapping Text + Card */
export const AiCreditsStatusNotice = createComponent(Card, {
  name: 'AiCreditsStatusNotice',
  extends: 'Card',
  borderWidth: 1,
  padding: '$3',
})

/** Bonus badge pill — highlights the active credit bonus percentage */
export const BonusBadgeFrame = createComponent(XStack, {
  name: 'BonusBadgeFrame',
  borderRadius: '$full',
  paddingHorizontal: '$3',
  paddingVertical: '$1',
  alignItems: 'center' as const,
  gap: '$1',
})

// ---------------------------------------------------------------------------
// AiCreditsHeroCard component
// ---------------------------------------------------------------------------

interface HeroCardProps {
  gBalance: string | null
  isGoodIdVerified: boolean
  bonusPercent: number
}

/**
 * Displays the connected wallet's G$ balance and the applicable bonus badge.
 * The bonus is 20% for GoodID-verified users (with stream), 10% otherwise.
 */
export function AiCreditsHero({ gBalance, isGoodIdVerified, bonusPercent }: HeroCardProps) {
  return (
    <AiCreditsHeroCard>
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack gap="$1">
          <Text variant="label" secondary>
            Your G$ Balance
          </Text>
          {gBalance !== null ? (
            <TokenAmount token="G$" amount={gBalance} size="xl" />
          ) : (
            <Spinner size="sm" />
          )}
        </YStack>

        {/* Bonus badge — shown when balance > 0 */}
        {gBalance && Number.parseFloat(gBalance) > 0 && (
          <BonusBadgeFrame backgroundColor="$backgroundPress">
            <Icon name="info" size="xs" color="primary" />
            <Text fontSize="$2" fontWeight="700" color="$primary">
              +{bonusPercent}% Bonus
            </Text>
            {isGoodIdVerified && (
              <Text fontSize="$1" secondary>
                (GoodID)
              </Text>
            )}
          </BonusBadgeFrame>
        )}
      </XStack>
    </AiCreditsHeroCard>
  )
}

// ---------------------------------------------------------------------------
// BuyerKeyPanel component
// ---------------------------------------------------------------------------

interface BuyerKeyPanelProps {
  buyerKey: string | null
  buyerKeyConfirmed: boolean
  onGenerate: () => void
  onPaste: (key: string) => void
  onConfirm: () => void
}

/**
 * Handles buyer key generation and confirmation.
 * Generated keys require copy-and-confirm before the user can proceed.
 * User-provided (pasted) keys are pre-confirmed.
 */
export function BuyerKeyPanel({
  buyerKey,
  buyerKeyConfirmed,
  onGenerate,
  onPaste,
  onConfirm,
}: BuyerKeyPanelProps) {
  const [pasteMode, setPasteMode] = useState(false)
  const [pasteValue, setPasteValue] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!buyerKey) return
    await navigator.clipboard.writeText(buyerKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <BuyerKeyPanelCard>
      <Heading level={5}>Buyer Key</Heading>
      <Text secondary>
        Your buyer key links your AI credits on Base to your identity. Generate a new one or paste
        an existing key.
      </Text>

      {!pasteMode && (
        <YStack gap="$3">
          <Button onPress={onGenerate}>
            <ButtonText>Generate New Key</ButtonText>
          </Button>

          <Button
            variant="outline"
            onPress={() => {
              setPasteMode(true)
            }}
          >
            <ButtonText>Paste Existing Key</ButtonText>
          </Button>

          {buyerKey && (
            <YStack gap="$2">
              <XStack
                backgroundColor="$backgroundMuted"
                borderRadius="$2"
                padding="$3"
                justifyContent="space-between"
                alignItems="center"
              >
                <Text
                  fontSize="$2"
                  style={{ fontFamily: 'monospace' } as React.CSSProperties}
                  flex={1}
                >
                  {buyerKey}
                </Text>
                <Button size="sm" variant="ghost" onPress={handleCopy}>
                  <ButtonText>{copied ? 'Copied!' : 'Copy'}</ButtonText>
                </Button>
              </XStack>

              {!buyerKeyConfirmed && (
                <Button onPress={onConfirm}>
                  <ButtonText>I've Copied My Key</ButtonText>
                </Button>
              )}

              {buyerKeyConfirmed && (
                <XStack gap="$2" alignItems="center">
                  <Icon name="check" size="sm" color="success" />
                  <Text color="$success" fontSize="$2">
                    Key confirmed — you can proceed
                  </Text>
                </XStack>
              )}
            </YStack>
          )}
        </YStack>
      )}

      {pasteMode && (
        <YStack gap="$3">
          <Input
            placeholder="0x..."
            value={pasteValue}
            onChangeText={setPasteValue}
            label="Buyer Key Address"
          />
          <XStack gap="$2">
            <Button
              flex={1}
              onPress={() => {
                if (pasteValue.trim()) {
                  onPaste(pasteValue.trim())
                  setPasteMode(false)
                  setPasteValue('')
                }
              }}
            >
              <ButtonText>Use This Key</ButtonText>
            </Button>
            <Button
              variant="outline"
              onPress={() => {
                setPasteMode(false)
                setPasteValue('')
              }}
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
          </XStack>
        </YStack>
      )}
    </BuyerKeyPanelCard>
  )
}

// ---------------------------------------------------------------------------
// OperatorConsentStep component
// ---------------------------------------------------------------------------

interface OperatorConsentStepProps {
  buyerKey: string | null
  operatorConsentSigned: boolean
  isSigning: boolean
  onSign: () => Promise<void>
}

/**
 * Prompts the user to sign the EIP-712 operator consent message.
 * This authorises AntseedBuyerOperator to manage deposits on Base on behalf of the buyer key.
 * The buyer key signs in-browser; the payer wallet is not involved here.
 */
export function OperatorConsentStep({
  buyerKey,
  operatorConsentSigned,
  isSigning,
  onSign,
}: OperatorConsentStepProps) {
  return (
    <OperatorConsentCard>
      <Heading level={5}>Operator Consent</Heading>
      <Text secondary>
        Sign a permission message allowing the AntseedBuyerOperator contract to manage your credits
        on Base. This happens in-browser and does not require a gas transaction.
      </Text>

      {buyerKey && (
        <Text fontSize="$2" secondary>
          Buyer key:{' '}
          <Text fontFamily="$mono" fontSize="$2">
            {buyerKey.slice(0, 10)}…{buyerKey.slice(-6)}
          </Text>
        </Text>
      )}

      {operatorConsentSigned ? (
        <XStack gap="$2" alignItems="center">
          <Icon name="check" size="sm" color="success" />
          <Text color="$success">Consent signed — ready to pay</Text>
        </XStack>
      ) : (
        <Button
          onPress={() => {
            void onSign()
          }}
          disabled={!buyerKey || isSigning}
        >
          {isSigning ? (
            <XStack gap="$2" alignItems="center">
              <ButtonText>Signing…</ButtonText>
              <Spinner size="sm" />
            </XStack>
          ) : (
            <ButtonText>Sign Consent</ButtonText>
          )}
        </Button>
      )}
    </OperatorConsentCard>
  )
}

// ---------------------------------------------------------------------------
// AmountPicker component
// ---------------------------------------------------------------------------

interface AmountPickerProps {
  depositAmount: string
  streamAmount: string
  gBalance: string | null
  bonusPercent: number
  isGoodIdVerified: boolean
  onDepositChange: (v: string) => void
  onStreamChange: (v: string) => void
}

/**
 * Two-field picker for the one-time deposit and monthly stream amounts.
 * Shows USD equivalent estimates and the applicable bonus badge.
 */
export function AmountPicker({
  depositAmount,
  streamAmount,
  gBalance,
  bonusPercent,
  isGoodIdVerified,
  onDepositChange,
  onStreamChange,
}: AmountPickerProps) {
  // Approximate G$ → USD conversion for display purposes
  const G_USD_RATE = 0.0015
  const depositUsd = (Number.parseFloat(depositAmount) || 0) * G_USD_RATE
  const streamUsd = (Number.parseFloat(streamAmount) || 0) * G_USD_RATE
  const balance = Number.parseFloat(gBalance ?? '0')
  const totalG = (Number.parseFloat(depositAmount) || 0) + (Number.parseFloat(streamAmount) || 0)
  const isOverBalance = totalG > balance

  return (
    <AmountPickerCard>
      <Heading level={5}>Choose Amounts</Heading>

      {/* One-time deposit field */}
      <YStack gap="$1">
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">One-time Deposit (G$)</Text>
          <Text fontSize="$1" secondary>
            +10% bonus
          </Text>
        </XStack>
        <Input
          value={depositAmount}
          onChangeText={onDepositChange}
          placeholder="Min 1 G$"
          error={Number.parseFloat(depositAmount) > 0 && Number.parseFloat(depositAmount) < 1}
        />
        {Number.parseFloat(depositAmount) > 0 && (
          <Text fontSize="$1" secondary>
            ≈ ${depositUsd.toFixed(4)} USD
          </Text>
        )}
      </YStack>

      {/* Monthly stream field */}
      <YStack gap="$1">
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">Monthly Stream (G$)</Text>
          <Text fontSize="$1" secondary>
            {isGoodIdVerified ? '+20% bonus (GoodID)' : '+20% with GoodID'}
          </Text>
        </XStack>
        <Input
          value={streamAmount}
          onChangeText={onStreamChange}
          placeholder="0 G$ (optional)"
          error={Number.parseFloat(streamAmount) > 0 && Number.parseFloat(streamAmount) < 1}
        />
        {Number.parseFloat(streamAmount) > 0 && (
          <Text fontSize="$1" secondary>
            ≈ ${streamUsd.toFixed(4)} USD/month
          </Text>
        )}
      </YStack>

      <Separator />

      {/* Total row */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text variant="label">Total</Text>
        <TokenAmount token="G$" amount={totalG.toFixed(2)} size="md" />
      </XStack>

      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$1" secondary>
          Applied bonus
        </Text>
        <BonusBadgeFrame backgroundColor="$backgroundPress">
          <Text fontSize="$2" fontWeight="700" color="$primary">
            +{bonusPercent}%
          </Text>
        </BonusBadgeFrame>
      </XStack>

      {isOverBalance && (
        <AiCreditsStatusNotice borderColor="$warning">
          <Text color="$warning" fontSize="$2">
            Total exceeds your G$ balance. Reduce the amounts.
          </Text>
        </AiCreditsStatusNotice>
      )}
    </AmountPickerCard>
  )
}

// ---------------------------------------------------------------------------
// CreditsBalanceCard component
// ---------------------------------------------------------------------------

interface CreditsBalanceProps {
  aiCreditsBalance: string | null
  setupSnippet: string | null
}

/**
 * Shows the current AI credits balance on Base with a compact usage bar.
 */
export function CreditsBalance({ aiCreditsBalance, setupSnippet: _ }: CreditsBalanceProps) {
  return (
    <CreditsBalanceCard>
      <XStack justifyContent="space-between" alignItems="center">
        <Text variant="label">AI Credits (Base)</Text>
        <Icon name="zap" size="sm" color="primary" />
      </XStack>
      {aiCreditsBalance !== null ? (
        <Heading level={3}>{Number.parseFloat(aiCreditsBalance).toFixed(2)} credits</Heading>
      ) : (
        <Spinner size="sm" />
      )}
    </CreditsBalanceCard>
  )
}

// ---------------------------------------------------------------------------
// SetupSnippetCard component
// ---------------------------------------------------------------------------

interface SetupSnippetProps {
  snippet: string
}

/**
 * Displays a copyable API key / base URL code block for Cursor, Cline, etc.
 */
export function SetupSnippet({ snippet }: SetupSnippetProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <SetupSnippetCard>
      <XStack justifyContent="space-between" alignItems="center">
        <Heading level={5}>API Setup</Heading>
        <Button size="sm" variant="ghost" onPress={handleCopy}>
          <ButtonText>{copied ? 'Copied!' : 'Copy'}</ButtonText>
        </Button>
      </XStack>
      <YStack
        backgroundColor="$backgroundMuted"
        borderRadius="$2"
        padding="$3"
      >
        <Text style={{ fontFamily: 'monospace' } as React.CSSProperties} fontSize="$2">
          {snippet}
        </Text>
      </YStack>
      <Text fontSize="$1" secondary>
        Paste these into your Cursor, Cline, or VS Code Copilot settings to start using AI credits.
      </Text>
    </SetupSnippetCard>
  )
}

// ---------------------------------------------------------------------------
// UsageLog component
// ---------------------------------------------------------------------------

interface UsageLogProps {
  entries: AiCreditsUsageEntry[]
}

/**
 * Accordion list of usage sessions, showing credits used per model.
 */
export function UsageLog({ entries }: UsageLogProps) {
  const [expanded, setExpanded] = useState(false)

  if (entries.length === 0) return null

  const total = entries.reduce((sum, e) => sum + e.creditsUsed, 0)

  return (
    <UsageLogCard>
      <XStack
        justifyContent="space-between"
        alignItems="center"
        onPress={() => setExpanded((v) => !v)}
        cursor="pointer"
      >
        <Heading level={5}>Usage History</Heading>
        <XStack gap="$2" alignItems="center">
          <Text fontSize="$2" secondary>
            {total.toFixed(1)} total credits
          </Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size="sm" />
        </XStack>
      </XStack>

      {expanded && (
        <YStack gap="$2">
          {entries.map((entry) => (
            <YStack key={entry.sessionId} gap="$1">
              <Separator />
              <XStack justifyContent="space-between" alignItems="center">
                <YStack>
                  <Text fontSize="$2" fontWeight="600">
                    {entry.model}
                  </Text>
                  <Text fontSize="$1" secondary>
                    {new Date(entry.timestamp).toLocaleString()}
                  </Text>
                </YStack>
                <Text fontSize="$2" color="$primary">
                  -{entry.creditsUsed.toFixed(1)} credits
                </Text>
              </XStack>
            </YStack>
          ))}
        </YStack>
      )}
    </UsageLogCard>
  )
}

// ---------------------------------------------------------------------------
// AiCreditsFlowStepper component
// ---------------------------------------------------------------------------

/** Map of step IDs for the AI credits purchase flow */
export type AiCreditsFlowStep = 'connect' | 'buyer_key' | 'consent' | 'amount' | 'pay'

interface AiCreditsFlowStepperProps {
  state: AiCreditsWidgetAdapterState
}

function mapStatusToActiveStep(
  state: AiCreditsWidgetAdapterState,
): AiCreditsFlowStep | null {
  if (state.status === 'disconnected') return 'connect'
  if (!state.buyerKey || !state.buyerKeyConfirmed) return 'buyer_key'
  if (!state.operatorConsentSigned) return 'consent'
  if (state.status === 'connected_empty') return 'amount'
  if (
    state.status === 'quote_ready' ||
    state.status === 'payment_pending' ||
    state.status === 'payment_confirmed'
  )
    return 'pay'
  return null
}

/**
 * Wraps the Stepper component with widget-specific steps for the purchase flow.
 */
export function AiCreditsFlowStepper({ state }: AiCreditsFlowStepperProps) {
  const activeStep = mapStatusToActiveStep(state)

  function getStepStatus(
    step: AiCreditsFlowStep,
  ): StepperStepItem['status'] {
    const isConnected = state.address !== null
    const hasBuyerKey = state.buyerKey !== null && state.buyerKeyConfirmed
    const hasConsent = state.operatorConsentSigned
    const hasAmount =
      Number.parseFloat(state.depositAmount) >= 1 || Number.parseFloat(state.streamAmount) >= 1

    switch (step) {
      case 'connect':
        if (isConnected) return 'completed'
        if (state.status === 'unsupported_chain') return 'failed'
        return activeStep === 'connect' ? 'active' : 'pending'
      case 'buyer_key':
        if (hasBuyerKey) return 'completed'
        if (!isConnected) return 'pending'
        return activeStep === 'buyer_key' ? 'active' : 'pending'
      case 'consent':
        if (hasConsent) return 'completed'
        if (!hasBuyerKey) return 'pending'
        return activeStep === 'consent' ? 'active' : 'pending'
      case 'amount':
        if (hasAmount && hasConsent) return 'completed'
        if (!hasConsent) return 'pending'
        return activeStep === 'amount' ? 'active' : 'pending'
      case 'pay':
        if (
          state.status === 'has_credits' ||
          state.status === 'usage_active' ||
          state.status === 'usage_empty' ||
          state.status === 'payment_confirmed'
        )
          return 'completed'
        if (state.status === 'payment_failed') return 'failed'
        if (state.status === 'payment_pending') return 'active'
        if (!hasAmount) return 'pending'
        return activeStep === 'pay' ? 'active' : 'pending'
      default:
        return 'pending'
    }
  }

  const steps: StepperStepItem[] = [
    {
      id: 'connect',
      title: 'Connect Wallet',
      description:
        state.status === 'unsupported_chain' ? 'Switch to Celo to continue' : undefined,
      status: getStepStatus('connect'),
    },
    {
      id: 'buyer_key',
      title: 'Buyer Key',
      description: 'Generate or provide your AI credits buyer key',
      status: getStepStatus('buyer_key'),
    },
    {
      id: 'consent',
      title: 'Operator Consent',
      description: 'Sign permission for the AntseedBuyerOperator',
      status: getStepStatus('consent'),
    },
    {
      id: 'amount',
      title: 'Choose Amounts',
      description: 'Set deposit and/or monthly stream amounts',
      status: getStepStatus('amount'),
    },
    {
      id: 'pay',
      title: 'Buy Credits',
      description:
        state.status === 'payment_pending'
          ? 'Transaction submitted…'
          : state.status === 'payment_confirmed'
            ? 'Settling on Base…'
            : state.status === 'payment_failed'
              ? state.error ?? 'Payment failed'
              : 'Confirm the Celo transaction',
      status: getStepStatus('pay'),
    },
  ]

  return (
    <Stepper
      steps={steps}
      activeStepId={activeStep}
      header={
        <Heading level={5} secondary>
          Purchase Flow
        </Heading>
      }
    />
  )
}
