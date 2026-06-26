import React, { useState } from 'react'
import {
  createComponent,
  Card,
  Heading,
  Text,
  Anchor,
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
  AiCreditsWidgetAdapterActions,
  AiCreditsUsageEntry,
} from './widgetRuntimeContract'
import { ANTSEED_DEPOSITS_BASE_ADDRESS } from './operatorConsent'

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
  buyerKeyPrivate: string | null
  buyerKeyConfirmed: boolean
  onGenerate: () => void | Promise<void>
  onConfirm: () => void
}

export function BuyerKeyPanel({
  buyerKey,
  buyerKeyPrivate,
  buyerKeyConfirmed,
  onGenerate,
  onConfirm,
}: BuyerKeyPanelProps) {
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [copiedPrivate, setCopiedPrivate] = useState(false)
  const [isPrivateKeyVisible, setIsPrivateKeyVisible] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      await onGenerate()
    } finally {
      setIsGenerating(false)
    }
  }

  const monospaceSingleLineStyle = {
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as React.CSSProperties

  async function handleCopyAddress() {
    if (!buyerKey) return
    await navigator.clipboard.writeText(buyerKey)
    setCopiedAddress(true)
    setTimeout(() => setCopiedAddress(false), 2000)
  }

  async function handleCopyPrivate() {
    if (!buyerKeyPrivate) return
    await navigator.clipboard.writeText(buyerKeyPrivate)
    setCopiedPrivate(true)
    setTimeout(() => setCopiedPrivate(false), 2000)
  }

  return (
    <BuyerKeyPanelCard>
      <Heading level={5}>Buyer Key</Heading>
      <Text>
        Sign a message with your payer wallet to derive a deterministic AntSeed buyer key. Save the
        private key — you will need it to authenticate from your developer tools.
      </Text>

      <YStack gap="$3">
        <Button onPress={handleGenerate} disabled={isGenerating}>
          <ButtonText>{isGenerating ? 'Waiting for signature…' : 'Sign & Generate Key'}</ButtonText>
        </Button>

        {buyerKey && (
            <YStack gap="$2">
              {/* Address row */}
              <Text variant="label" secondary>
                Address (registered on-chain)
              </Text>
              <XStack
                backgroundColor="$backgroundMuted"
                borderRadius="$2"
                padding="$3"
                justifyContent="space-between"
                alignItems="center"
              >
                <Text
                  fontSize="$2"
                  style={monospaceSingleLineStyle}
                  flex={1}
                  numberOfLines={1}
                >
                  {buyerKey}
                </Text>
                <Button size="sm" variant="ghost" iconSize="sm" onPress={handleCopyAddress}>
                  <Icon name={copiedAddress ? 'check' : 'copy'} size="xs" color={copiedAddress ? 'success' : 'text'} />
                </Button>
              </XStack>

              {/* Private key row — only shown for generated keys */}
              {buyerKeyPrivate && (
                <>
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text variant="label" secondary>
                      Private Key — save this securely
                    </Text>
                    <Button
                      variant="text"
                      size="sm"
                      onPress={() => {
                        setIsPrivateKeyVisible((prev) => !prev)
                      }}
                    >
                      <ButtonText>{isPrivateKeyVisible ? 'Hide' : 'Reveal'}</ButtonText>
                    </Button>
                  </XStack>
                  <AiCreditsStatusNotice borderColor="$warning">
                    <Text color="$warning" fontSize="$2">
                      ⚠ Revealing your private key can expose your account. Never share it — store it in a
                      secure place.
                    </Text>
                  </AiCreditsStatusNotice>
                  <XStack
                    backgroundColor="$backgroundMuted"
                    borderRadius="$2"
                    padding="$3"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Text
                      fontSize="$2"
                      style={monospaceSingleLineStyle}
                      flex={1}
                      numberOfLines={1}
                    >
                      {isPrivateKeyVisible ? buyerKeyPrivate : '•'.repeat(Math.min(48, buyerKeyPrivate.length))}
                    </Text>
                    <Button size="sm" variant="ghost" iconSize="sm" onPress={handleCopyPrivate}>
                      <Icon name={copiedPrivate ? 'check' : 'copy'} size="xs" color={copiedPrivate ? 'success' : 'text'} />
                    </Button>
                  </XStack>
                </>
              )}

              {!buyerKeyConfirmed && (
                <Button onPress={onConfirm}>
                  <ButtonText>I've Saved My Private Key</ButtonText>
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
    </BuyerKeyPanelCard>
  )
}

// ---------------------------------------------------------------------------
// OperatorConsentStep component
// ---------------------------------------------------------------------------

interface OperatorConsentStepProps {
  buyerKey: string | null
  buyerKeyPrivate: string | null
  operatorConsentSigned: boolean
  onSign: () => Promise<void>
}

export function OperatorConsentStep({
  buyerKey,
  buyerKeyPrivate,
  operatorConsentSigned,
  onSign,
}: OperatorConsentStepProps) {
  const [isSigning, setIsSigning] = useState(false)
  const canSign = Boolean(buyerKey && buyerKeyPrivate)

  return (
    <OperatorConsentCard>
      <Heading level={5}>Authorize AntSeed Operator</Heading>
      <Text fontSize="$2" lineHeight="$3">
        Your buyer key signs an EIP-712 SetOperator message on Base. The backend submits it to
        AntseedDeposits so the funding vault can act as your operator. No gas is required from
        you.
      </Text>

      {buyerKey && (
        <Text fontSize="$2" lineHeight="$2">
          Buyer address:{' '}
          <Text fontFamily="$mono" fontSize="$2">
            {buyerKey.slice(0, 10)}…{buyerKey.slice(-6)}
          </Text>
        </Text>
      )}

      {operatorConsentSigned ? (
        <XStack gap="$2" alignItems="center">
          <Icon name="check" size="sm" color="success" />
          <Text color="$success">Operator consent accepted — ready to pay</Text>
        </XStack>
      ) : (
        <Button
          onPress={() => {
            setIsSigning(true)
            void onSign().finally(() => {
              setIsSigning(false)
            })
          }}
          disabled={!canSign || isSigning}
        >
          {isSigning ? (
            <XStack gap="$2" alignItems="center">
              <ButtonText>Signing…</ButtonText>
              <Spinner size="sm" />
            </XStack>
          ) : (
            <ButtonText>Sign Operator Consent</ButtonText>
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
}

export function CreditsBalance({ aiCreditsBalance }: CreditsBalanceProps) {
  return (
    <CreditsBalanceCard>
      <XStack justifyContent="space-between" alignItems="center">
        <Text variant="label">AI Credits</Text>
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

const ANTSEED_API_DOCS_URL = 'https://antseed.com/docs/guides/using-the-api'

const setupSnippetLineStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: 13,
  lineHeight: '20px',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
}

interface SetupSnippetProps {
  snippet: string
}

export function SetupSnippet({ snippet }: SetupSnippetProps) {
  const [copied, setCopied] = useState(false)
  const copyText = snippet.replace(/\n\n+/g, '\n').trim()
  const lines = snippet.trim().split('\n')

  async function handleCopy() {
    await navigator.clipboard.writeText(copyText)
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
      <YStack backgroundColor="$backgroundMuted" borderRadius="$2" padding="$3" width="100%" gap="$1">
        {lines.map((line, index) => (
          <Text key={index} color="$text" style={setupSnippetLineStyle}>
            {line.length > 0 ? line : ' '}
          </Text>
        ))}
      </YStack>
      <Text fontSize="$1" secondary>
        Setup guide:{' '}
        <Anchor href={ANTSEED_API_DOCS_URL} target="_blank">
          antseed.com/docs
        </Anchor>
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
 * Accordion list of historical credits with mandatory source filtering.
 * `streamCron` is excluded by default until the user explicitly enables it.
 */
export function UsageLog({ entries }: UsageLogProps) {
  const [expanded, setExpanded] = useState(false)
  const [enabledSources, setEnabledSources] = useState<
    Array<'deposit' | 'streamUpdate' | 'streamRequest' | 'streamCron'>
  >(['deposit', 'streamUpdate', 'streamRequest'])

  const entriesWithSource = entries.filter((entry) => entry.source !== undefined)
  const filteredEntries =
    entriesWithSource.length === 0
      ? entries
      : entries.filter((entry) => !entry.source || enabledSources.includes(entry.source))

  const total = filteredEntries.reduce((sum, e) => sum + e.creditsUsed, 0)

  function toggleSource(source: 'deposit' | 'streamUpdate' | 'streamRequest' | 'streamCron') {
    setEnabledSources((previousSources) => {
      if (previousSources.includes(source)) {
        return previousSources.filter((value) => value !== source)
      }
      return [...previousSources, source]
    })
  }

  function sourceLabel(source: 'deposit' | 'streamUpdate' | 'streamRequest' | 'streamCron') {
    if (source === 'deposit') return 'deposit'
    if (source === 'streamUpdate') return 'streamUpdate'
    if (source === 'streamRequest') return 'streamRequest'
    return 'streamCron'
  }

  return (
    <UsageLogCard>
      <XStack
        justifyContent="space-between"
        alignItems="center"
        onPress={() => setExpanded((v) => !v)}
        cursor="pointer"
      >
        <Heading level={5}>Historical Credits</Heading>
        <XStack gap="$2" alignItems="center">
          <Text fontSize="$2" secondary>
            {total.toFixed(1)} total credits
          </Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size="sm" />
        </XStack>
      </XStack>

      <YStack gap="$2">
        {/* Source filter is always visible and starts with streamCron disabled by default. */}
        <Text fontSize="$1" secondary>
          Source filter (required)
        </Text>
        <XStack gap="$2" flexWrap="wrap">
          {(
            ['deposit', 'streamUpdate', 'streamRequest', 'streamCron'] as const
          ).map((source) => {
            const isEnabled = enabledSources.includes(source)
            return (
              <Button
                key={source}
                size="sm"
                variant={isEnabled ? 'secondary' : 'ghost'}
                onPress={() => toggleSource(source)}
              >
                <ButtonText>{sourceLabel(source)}</ButtonText>
              </Button>
            )
          })}
        </XStack>
      </YStack>

      {expanded && (
        <YStack gap="$2">
          {filteredEntries.length === 0 ? (
            <AiCreditsStatusNotice borderColor="$borderColor">
              <Text secondary>No historical credit entries for the selected sources.</Text>
            </AiCreditsStatusNotice>
          ) : (
            filteredEntries.map((entry) => (
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
                    {entry.source && (
                      <Text fontSize="$1" secondary>
                        source: {entry.source}
                      </Text>
                    )}
                  </YStack>
                  <YStack alignItems="flex-end" gap="$1">
                    <Text fontSize="$2" color="$primary">
                      {entry.kind === 'funding' ? '+' : '-'}
                      {entry.creditsUsed.toFixed(1)} credits
                    </Text>
                    {entry.gdAmount && (
                      <Text fontSize="$1" secondary>
                        {entry.gdAmount} G$
                      </Text>
                    )}
                  </YStack>
                </XStack>
              </YStack>
            ))
          )}
        </YStack>
      )}
    </UsageLogCard>
  )
}

interface AiCreditsManagementDashboardProps {
  state: AiCreditsWidgetAdapterState
  actions: AiCreditsWidgetAdapterActions
}

/**
 * Management dashboard that keeps all account and credits controls on one coherent screen.
 * It intentionally includes routing stubs for "Buy/Add credit" and "Update flow".
 */
export function AiCreditsManagementDashboard({
  state,
  actions,
}: AiCreditsManagementDashboardProps) {
  const [showBonusHelp, setShowBonusHelp] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)

  const isAiCreditsLoading =
    state.status === 'payment_pending' ||
    state.status === 'payment_confirmed' ||
    state.aiCreditsBalance === null
  const isAiCreditsError =
    state.status === 'backend_unavailable' || state.status === 'payment_failed'
  const isOverviewLoading = state.gBalance === null
  const depositedG = Number.parseFloat(state.depositAmount || '0').toFixed(2)
  const estimatedMonthlyStream = Number.parseFloat(state.streamAmount || '0').toFixed(2)
  const currentFlowLabel = Number.parseFloat(state.streamAmount || '0') > 0 ? 'Active' : 'Not active'

  return (
    <YStack gap="$4">
      <Card>
        <YStack gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Heading level={5}>AI credit management</Heading>
            <BonusBadgeFrame backgroundColor="$backgroundPress">
              <Text fontSize="$2" fontWeight="700" color="$primary">
                +{state.bonusPercent}% Bonus
              </Text>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => {
                  setShowBonusHelp((currentValue) => !currentValue)
                }}
              >
                <Icon name="info" size="xs" color="primary" />
              </Button>
            </BonusBadgeFrame>
          </XStack>
          {showBonusHelp && (
            <AiCreditsStatusNotice borderColor="$borderColor">
              <Text secondary>
                Bonus applies as +10% by default and +20% on stream funding for GoodID verified
                accounts.
              </Text>
            </AiCreditsStatusNotice>
          )}
        </YStack>
      </Card>

      <Card>
        <YStack gap="$3">
          <Heading level={5}>AI credits</Heading>
          {isAiCreditsLoading ? (
            <XStack gap="$2" alignItems="center">
              <Spinner size="sm" />
              <Text secondary>Loading AI credits…</Text>
            </XStack>
          ) : isAiCreditsError ? (
            <AiCreditsStatusNotice borderColor="$error">
              <Text color="$error">{state.error ?? 'Could not load AI credits.'}</Text>
            </AiCreditsStatusNotice>
          ) : (
            <YStack gap="$2">
              <Text>Total AI credits now: {state.aiCreditsBalance ?? '0.00'}</Text>
              <Text secondary>Estimated monthly stream: {estimatedMonthlyStream} G$</Text>
            </YStack>
          )}
          <Button
            onPress={() => {
              // TODO: replace with route to the dedicated add-credit widget when available.
              void actions.retry()
            }}
          >
            <ButtonText>Buy/Add credit</ButtonText>
          </Button>
        </YStack>
      </Card>

      <Card>
        <YStack gap="$3">
          <Heading level={5}>G$ account overview</Heading>
          {isOverviewLoading ? (
            <XStack gap="$2" alignItems="center">
              <Spinner size="sm" />
              <Text secondary>Loading account overview…</Text>
            </XStack>
          ) : (
            <YStack gap="$2">
              <Text>G$ wallet balance: {state.gBalance ?? '0.00'} G$</Text>
              <Text>Deposited G$: {depositedG} G$</Text>
            </YStack>
          )}

          <Separator />

          <YStack gap="$2">
            <Heading level={6}>Stream management</Heading>
            <Text>Current flow: {currentFlowLabel}</Text>
            <Text secondary>Configured amount: {estimatedMonthlyStream} G$/month</Text>
            <Button
              variant="ghost"
              onPress={() => {
                // TODO: replace with route to stream update flow widget when available.
                void actions.retry()
              }}
            >
              <ButtonText>Update flow</ButtonText>
            </Button>
          </YStack>
        </YStack>
      </Card>

      <Card>
        <YStack gap="$3">
          <Heading level={5}>Operator</Heading>
          <Text>Operator address: {ANTSEED_DEPOSITS_BASE_ADDRESS}</Text>
          <Text>
            Consent state: {state.operatorConsentSigned ? 'accepted' : 'pending signature'}
          </Text>
          {!state.buyerKey && (
            <AiCreditsStatusNotice borderColor="$borderColor">
              <Text secondary>No operator key generated yet.</Text>
            </AiCreditsStatusNotice>
          )}
          {state.error && !state.operatorConsentSigned && (
            <AiCreditsStatusNotice borderColor="$error">
              <Text color="$error">{state.error}</Text>
            </AiCreditsStatusNotice>
          )}
          <XStack gap="$2">
            <Button
              variant="ghost"
              onPress={() => {
                void actions.generateBuyerKey()
              }}
            >
              <ButtonText>Sign & Generate flow</ButtonText>
            </Button>
            <Button
              onPress={() => {
                void actions.signOperatorConsent()
              }}
            >
              <ButtonText>Sign consent</ButtonText>
            </Button>
          </XStack>
          <YStack gap="$2">
            <Text variant="label" secondary>
              Public key
            </Text>
            <Text fontFamily="$mono">{state.buyerKey ?? 'Not generated yet'}</Text>
            <Text variant="label" secondary>
              Private key
            </Text>
            <XStack gap="$2" alignItems="center">
              <Text fontFamily="$mono">
                {state.buyerKeyPrivate
                  ? showPrivateKey
                    ? state.buyerKeyPrivate
                    : '•'.repeat(Math.min(48, state.buyerKeyPrivate.length))
                  : 'Not generated yet'}
              </Text>
              {state.buyerKeyPrivate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setShowPrivateKey((currentValue) => !currentValue)
                  }}
                >
                  <ButtonText>{showPrivateKey ? 'Hide' : 'Reveal'}</ButtonText>
                </Button>
              )}
            </XStack>
          </YStack>
        </YStack>
      </Card>

      <Card>
        <YStack gap="$3">
          <Heading level={5}>Historical credits</Heading>
          {state.status === 'payment_pending' || state.status === 'payment_confirmed' ? (
            <XStack gap="$2" alignItems="center">
              <Spinner size="sm" />
              <Text secondary>Loading historical credits…</Text>
            </XStack>
          ) : state.status === 'backend_unavailable' ? (
            <AiCreditsStatusNotice borderColor="$error">
              <Text color="$error">{state.error ?? 'Could not load historical credits.'}</Text>
            </AiCreditsStatusNotice>
          ) : (
            <UsageLog entries={state.usageLog} />
          )}
        </YStack>
      </Card>
    </YStack>
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
