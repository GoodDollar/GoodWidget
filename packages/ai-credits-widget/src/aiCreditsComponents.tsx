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
  copyTextToClipboard,
} from '@goodwidget/ui'
import type { StepperStepItem } from '@goodwidget/ui'
import type {
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterState,
  AiCreditsUsageEntry,
  AiCreditsQuote,
} from './widgetRuntimeContract'
import { formatUsdMicro } from './quoteMath'

const monospaceSingleLineStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 10)}…${address.slice(-6)}`
}

function useCopyFeedback() {
  const [copied, setCopied] = useState(false)
  const copy = async (text: string) => {
    if (!(await copyTextToClipboard(text))) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return { copied, copy }
}

function AddressLabel({ label, address }: { label: string; address: string }) {
  return (
    <YStack gap="$1">
      <Text variant="label" secondary>
        {label}
      </Text>
      <Text fontSize="$2" fontFamily="$mono">
        {truncateAddress(address)}
      </Text>
    </YStack>
  )
}

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

/** Credits management dashboard card */
export const CreditsManagementCardFrame = createComponent(Card, {
  name: 'CreditsManagementCard',
  extends: 'Card',
  gap: '$4',
})

/** Buyer and operator management card */
export const BuyerOperatorCardFrame = createComponent(Card, {
  name: 'BuyerOperatorCard',
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
  const { copied: copiedAddress, copy: copyAddress } = useCopyFeedback()
  const { copied: copiedPrivate, copy: copyPrivate } = useCopyFeedback()
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
                <Button size="sm" variant="ghost" iconSize="sm" onPress={() => void copyAddress(buyerKey)}>
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
                    <Button size="sm" variant="ghost" iconSize="sm" onPress={() => void copyPrivate(buyerKeyPrivate)}>
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
        Your buyer key signs an EIP-712 SetOperator message. The backend submits it to
        AntseedDeposits so the funding vault can act as your operator. No gas is required from
        you.
      </Text>

      {buyerKey && (
        <Text fontSize="$2" lineHeight="$2">
          Buyer address:{' '}
          <Text fontFamily="$mono" fontSize="$2">
            {truncateAddress(buyerKey)}
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
  quote: AiCreditsQuote | null
  onDepositChange: (v: string) => void
  onStreamChange: (v: string) => void
}

export function AmountPicker({
  depositAmount,
  streamAmount,
  gBalance,
  quote,
  onDepositChange,
  onStreamChange,
}: AmountPickerProps) {
  const depositG = Number.parseFloat(depositAmount) || 0
  const streamG = Number.parseFloat(streamAmount) || 0
  const balance = Number.parseFloat(gBalance ?? '0')
  const totalG = depositG + streamG
  const isOverBalance = totalG > balance
  const bonusPercent = quote?.bonusPercent ?? 10

  const formatCredits = (value: string) => {
    const parsed = Number.parseFloat(value)
    return parsed < 10 ? parsed.toFixed(1) : parsed.toFixed(2)
  }

  return (
    <AmountPickerCard>
      <Heading level={5}>Buy Credits</Heading>

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
        {depositG > 0 && quote && (
          <Text fontSize="$1" secondary>
            ≈ ${quote.depositAmountUsd} USD
          </Text>
        )}
        {depositG > 0 && !quote && (
          <Spinner size="sm" />
        )}
      </YStack>

      <YStack gap="$1">
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">Monthly Stream (G$)</Text>
          <Text fontSize="$1" secondary>
            {bonusPercent >= 20 ? '+20% bonus (GoodID)' : '+20% with GoodID'}
          </Text>
        </XStack>
        <Input
          value={streamAmount}
          onChangeText={onStreamChange}
          placeholder="0 G$ (optional)"
          error={Number.parseFloat(streamAmount) > 0 && Number.parseFloat(streamAmount) < 1}
        />
        {streamG > 0 && quote && (
          <YStack gap="$0.5">
            <Text fontSize="$1" secondary>
              ≈ ${quote.streamAmountUsd} USD/month
            </Text>
          </YStack>
        )}
        {streamG > 0 && !quote && (
          <Spinner size="sm" />
        )}
      </YStack>

      <Separator />

      <XStack justifyContent="space-between" alignItems="center">
        <Text variant="label">Total</Text>
        <TokenAmount token="G$" amount={totalG.toFixed(2)} size="md" />
      </XStack>

      {quote && (
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label" secondary>
            Est. credits
          </Text>
          <Text fontSize="$2" color="$primary" fontWeight="700">
            {formatCredits(quote.totalCredits)}
          </Text>
        </XStack>
      )}

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
// CreditsManagementCard component
// ---------------------------------------------------------------------------

interface CreditsManagementCardProps {
  state: AiCreditsWidgetAdapterState
  actions: Pick<
    AiCreditsWidgetAdapterActions,
    'startPurchase' | 'setChannelId' | 'setWithdrawAmount' | 'closeChannel' | 'withdrawCredits'
  >
}

export function CreditsManagementCard({ state, actions }: CreditsManagementCardProps) {
  const [isClosing, setIsClosing] = useState(false)
  const {
    aiCreditsBalance,
    gBalance,
    totalGdDepositedG,
    monthlyStreamG,
    monthlyStreamCredits,
    withdrawableUsd,
    channelId,
    withdrawAmount,
  } = state

  const withdrawableDisplay =
    withdrawableUsd && BigInt(withdrawableUsd) > 0n ? formatUsdMicro(withdrawableUsd) : null

  return (
    <CreditsManagementCardFrame>
      <Heading level={5}>AI Credits</Heading>

      <YStack gap="$2">
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">Total Credits</Text>
          {aiCreditsBalance !== null ? (
            <Heading level={4}>{Number.parseFloat(aiCreditsBalance).toFixed(2)}</Heading>
          ) : (
            <Spinner size="sm" />
          )}
        </XStack>

        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label" secondary>
            Payer G$ Balance
          </Text>
          {gBalance !== null ? (
            <TokenAmount token="G$" amount={gBalance} size="sm" />
          ) : (
            <Spinner size="sm" />
          )}
        </XStack>

        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label" secondary>
            Total Deposited
          </Text>
          <TokenAmount token="G$" amount={totalGdDepositedG ?? '0.00'} size="sm" />
        </XStack>

        <Separator />

        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">Monthly Stream</Text>
          <TokenAmount token="G$" amount={monthlyStreamG ?? '0.00'} size="sm" />
        </XStack>

        {monthlyStreamCredits && Number.parseFloat(monthlyStreamCredits) > 0 && (
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="label" secondary>
              Est. Monthly Credits
            </Text>
            <Text fontSize="$2" color="$primary">
              ~{Number.parseFloat(monthlyStreamCredits).toFixed(2)} credits/mo
            </Text>
          </XStack>
        )}

        {withdrawableDisplay && (
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="label" secondary>
              Withdrawable
            </Text>
            <Text fontSize="$2">${withdrawableDisplay}</Text>
          </XStack>
        )}
      </YStack>

      <Button fullWidth onPress={actions.startPurchase}>
        <ButtonText>Add Credits / Update Stream</ButtonText>
      </Button>

      <YStack gap="$2">
        <Text variant="label">Close Channel</Text>
        <Input value={channelId} onChangeText={actions.setChannelId} placeholder="Channel ID" />
        <Button
          variant="outline"
          disabled={isClosing || !channelId.trim()}
          onPress={() => {
            setIsClosing(true)
            void Promise.resolve(actions.closeChannel()).finally(() => setIsClosing(false))
          }}
        >
          <ButtonText>{isClosing ? 'Closing…' : 'Close Channel'}</ButtonText>
        </Button>
      </YStack>

      <YStack gap="$2">
        <Text variant="label">Withdraw</Text>
        <Input
          value={withdrawAmount}
          onChangeText={actions.setWithdrawAmount}
          placeholder={withdrawableDisplay ? `Amount in USD (max $${withdrawableDisplay})` : 'Amount in USD'}
        />
        <AiCreditsStatusNotice>
          <Text fontSize="$2" secondary>
            Withdraw requires a buyer EIP-712 signature. UI signing is not implemented yet — mock
            backend only.
          </Text>
        </AiCreditsStatusNotice>
        <Button variant="outline" disabled>
          <ButtonText>Withdraw (coming soon)</ButtonText>
        </Button>
      </YStack>
    </CreditsManagementCardFrame>
  )
}

// ---------------------------------------------------------------------------
// BuyerOperatorCard component
// ---------------------------------------------------------------------------

interface BuyerOperatorCardProps {
  state: Pick<
    AiCreditsWidgetAdapterState,
    'address' | 'buyerKey' | 'buyerKeyPrivate' | 'operatorAddress' | 'operatorConsentSigned'
  >
  actions: Pick<AiCreditsWidgetAdapterActions, 'generateBuyerKey' | 'signOperatorConsent'>
}

export function BuyerOperatorCard({ state, actions }: BuyerOperatorCardProps) {
  const { address, buyerKey, buyerKeyPrivate, operatorAddress, operatorConsentSigned } = state
  const { copied: copiedPrivate, copy: copyPrivate } = useCopyFeedback()
  const [isPrivateKeyVisible, setIsPrivateKeyVisible] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSigning, setIsSigning] = useState(false)

  return (
    <BuyerOperatorCardFrame>
      <Heading level={5}>Buyer &amp; Operator</Heading>

      {address && <AddressLabel label="Payer" address={address} />}
      {buyerKey && <AddressLabel label="Buyer" address={buyerKey} />}
      {operatorAddress && <AddressLabel label="Operator" address={operatorAddress} />}

      <Button
        onPress={() => {
          setIsGenerating(true)
          void Promise.resolve(actions.generateBuyerKey()).finally(() => setIsGenerating(false))
        }}
        disabled={isGenerating}
      >
        <ButtonText>{isGenerating ? 'Waiting for signature…' : 'Sign & Generate Key'}</ButtonText>
      </Button>

      {buyerKeyPrivate && (
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="label" secondary>
              Private Key
            </Text>
            <Button
              variant="text"
              size="sm"
              onPress={() => setIsPrivateKeyVisible((prev) => !prev)}
            >
              <ButtonText>{isPrivateKeyVisible ? 'Hide' : 'Reveal'}</ButtonText>
            </Button>
          </XStack>
          <XStack
            backgroundColor="$backgroundMuted"
            borderRadius="$2"
            padding="$3"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text fontSize="$2" style={monospaceSingleLineStyle} flex={1} numberOfLines={1}>
              {isPrivateKeyVisible
                ? buyerKeyPrivate
                : '•'.repeat(Math.min(48, buyerKeyPrivate.length))}
            </Text>
            <Button
              size="sm"
              variant="ghost"
              iconSize="sm"
              onPress={() => void copyPrivate(buyerKeyPrivate)}
            >
              <Icon
                name={copiedPrivate ? 'check' : 'copy'}
                size="xs"
                color={copiedPrivate ? 'success' : 'text'}
              />
            </Button>
          </XStack>
        </YStack>
      )}

      <Button
        onPress={() => {
          setIsSigning(true)
          void Promise.resolve(actions.signOperatorConsent()).finally(() => setIsSigning(false))
        }}
        disabled={operatorConsentSigned || isSigning || !buyerKeyPrivate}
      >
        {isSigning ? (
          <XStack gap="$2" alignItems="center">
            <ButtonText>Signing…</ButtonText>
            <Spinner size="sm" />
          </XStack>
        ) : (
          <ButtonText>
            {operatorConsentSigned ? 'Operator Consented' : 'Sign Operator Consent'}
          </ButtonText>
        )}
      </Button>

      {operatorConsentSigned && (
        <XStack gap="$2" alignItems="center">
          <Icon name="check" size="sm" color="success" />
          <Text color="$success" fontSize="$2">
            Operator consent active
          </Text>
        </XStack>
      )}
    </BuyerOperatorCardFrame>
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
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyText = snippet.replace(/\n\n+/g, '\n').trim()
  const lines = snippet.trim().split('\n')

  async function handleCopy() {
    const copied = await copyTextToClipboard(copyText)
    if (!copied) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <SetupSnippetCard>
      <XStack justifyContent="space-between" alignItems="center">
        <XStack
          flex={1}
          justifyContent="space-between"
          alignItems="center"
          onPress={() => setExpanded((value) => !value)}
          cursor="pointer"
        >
          <Heading level={5}>API Setup</Heading>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size="sm" />
        </XStack>
        <Button size="sm" variant="ghost" onPress={handleCopy}>
          <ButtonText>{copied ? 'Copied!' : 'Copy'}</ButtonText>
        </Button>
      </XStack>

      {expanded && (
        <YStack gap="$2">
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
        </YStack>
      )}
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

  const isFundingHistory = entries.length === 0 || entries.every((entry) => entry.kind === 'funding')
  const total = entries.reduce((sum, entry) => sum + entry.creditsUsed, 0)
  const title = isFundingHistory ? 'Credit History' : 'Usage History'

  return (
    <UsageLogCard>
      <XStack
        justifyContent="space-between"
        alignItems="center"
        onPress={() => setExpanded((value) => !value)}
        cursor="pointer"
      >
        <Heading level={5}>{title}</Heading>
        <XStack gap="$2" alignItems="center">
          <Text fontSize="$2" secondary>
            {entries.length === 0 ? 'No entries yet' : `${total.toFixed(1)} total credits`}
          </Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size="sm" />
        </XStack>
      </XStack>

      {expanded && (
        <YStack gap="$2">
          {entries.length === 0 ? (
            <Text fontSize="$2" secondary>
              Purchases and funding activity will appear here.
            </Text>
          ) : (
            entries.map((entry) => (
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
                    {entry.kind === 'funding' ? '+' : '-'}
                    {entry.creditsUsed.toFixed(1)} credits
                  </Text>
                </XStack>
              </YStack>
            ))
          )}
        </YStack>
      )}
    </UsageLogCard>
  )
}

// ---------------------------------------------------------------------------
// AiCreditsFlowStepper component
// ---------------------------------------------------------------------------

/** Map of step IDs for the AI credits purchase flow */
export type AiCreditsFlowStep = 'connect' | 'buyer_key' | 'consent' | 'pay'

interface AiCreditsFlowStepperProps {
  state: AiCreditsWidgetAdapterState
}

function mapStatusToActiveStep(
  state: AiCreditsWidgetAdapterState,
): AiCreditsFlowStep | null {
  if (state.status === 'disconnected') return 'connect'
  if (!state.buyerKey || !state.buyerKeyConfirmed) return 'buyer_key'
  if (!state.operatorConsentSigned) return 'consent'
  if (
    state.status === 'purchase_setup' ||
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
      case 'pay':
        if (state.status === 'credits_management' || state.status === 'payment_confirmed')
          return 'completed'
        if (state.status === 'payment_failed') return 'failed'
        if (!hasConsent) return 'pending'
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
