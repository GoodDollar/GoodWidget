import React, { useEffect, useMemo, useState } from 'react'
import { Button, ButtonText, Card, Heading, Input, Separator, Spinner, Text, TokenAmount, XStack, YStack } from '@goodwidget/ui'
import type { AiCreditsQuote, AiCreditsWidgetStatus } from '../../widgetRuntimeContract'
import {
  formatUsd1ToG,
  formatUsdWithBonus,
  getDepositBonusPercent,
  getStreamBonusPercent,
  parseGAmount,
  quoteDepositBonusUsd,
  quoteDepositPrincipalUsd,
  quoteStreamBonusUsd,
  quoteStreamPrincipalUsd,
} from '../../quoteMath'
import {
  formatMinUsdDisplay,
  getPayDisabledMessage,
  getPaymentAmountValidation,
} from '../../vaultMinimums'
import { AiCreditsStatusNotice, BonusBadgeFrame } from '../theme/cards'
import { HoverTooltip } from '../shared/tooltips'
import { compactButtonProps } from '../shared/styles'

const DEFAULT_DEPOSIT_AMOUNT = '1'
const DEFAULT_STREAM_AMOUNT = '0'

function resolveInitialStreamAmount(monthlyStreamG: string | null | undefined): string {
  if (!monthlyStreamG) return DEFAULT_STREAM_AMOUNT
  return parseGAmount(monthlyStreamG) > 0 ? monthlyStreamG : DEFAULT_STREAM_AMOUNT
}

function BonusLabel({ label, active }: { label: string; active: boolean }) {
  return (
    <BonusBadgeFrame
      backgroundColor={active ? '$successMuted' : '$warningMuted'}
      borderWidth={1}
      borderColor={active ? '$success' : '$warning'}
    >
      <Text fontSize="$1" fontWeight="700" lineHeight={16} color={active ? '$success' : '$warning'}>
        {label}
      </Text>
    </BonusBadgeFrame>
  )
}

function BonusSummaryValue({
  quote,
  gdUsdPerToken,
  isGoodIdVerified,
  depositBonusPercent,
  streamBonusPercent,
  onVerifyGoodId,
  isVerifyingGoodId,
}: {
  quote: AiCreditsQuote
  gdUsdPerToken: number
  isGoodIdVerified: boolean
  depositBonusPercent: number
  streamBonusPercent: number
  onVerifyGoodId: () => Promise<void>
  isVerifyingGoodId: boolean
}) {
  if (!isGoodIdVerified) {
    return (
      <XStack gap="$1.5" alignItems="center" justifyContent="flex-end" flex={1} flexShrink={1} minWidth={0}>
        <Button
          variant="text"
          size="sm"
          disabled={isVerifyingGoodId}
          onPress={() => {
            void onVerifyGoodId()
          }}
        >
          {isVerifyingGoodId ? (
            <Spinner size="sm" />
          ) : (
            <ButtonText fontWeight="600">Verify to get Bonuses</ButtonText>
          )}
        </Button>
      </XStack>
    )
  }

  return (
    <Text fontSize="$2" fontWeight="700" color="$success">
      {formatMinUsdDisplay(
        quoteDepositBonusUsd(quote, gdUsdPerToken, isGoodIdVerified, depositBonusPercent),
      ) +
        ' + ' +
        formatMinUsdDisplay(
          quoteStreamBonusUsd(quote, gdUsdPerToken, isGoodIdVerified, streamBonusPercent),
        ) +
        '/month'}
    </Text>
  )
}

interface AmountPickerProps {
  status: AiCreditsWidgetStatus
  gBalance: string | null
  minDepositUsd: string | null
  minStreamUsd: string | null
  monthlyStreamG: string | null
  gdUsdPerToken: number | null
  isGoodIdVerified: boolean
  depositBonusPercent: number
  streamBonusPercent: number
  isPayPending: boolean
  buildQuote: (depositG: string, streamG: string) => Promise<AiCreditsQuote>
  onPay: (quote: AiCreditsQuote) => void
  onVerifyGoodId: () => Promise<void>
  embedded?: boolean
}

export function AmountPicker({
  status,
  gBalance,
  minDepositUsd,
  minStreamUsd,
  monthlyStreamG,
  gdUsdPerToken,
  isGoodIdVerified,
  depositBonusPercent,
  streamBonusPercent,
  isPayPending,
  buildQuote,
  onPay,
  onVerifyGoodId,
  embedded = false,
}: AmountPickerProps) {
  const streamSeed = useMemo(() => resolveInitialStreamAmount(monthlyStreamG), [monthlyStreamG])
  const [depositAmount, setDepositAmount] = useState(DEFAULT_DEPOSIT_AMOUNT)
  const [streamAmount, setStreamAmount] = useState(streamSeed)
  const [quote, setQuote] = useState<AiCreditsQuote | null>(null)
  const [quotePending, setQuotePending] = useState(false)
  const [isVerifyingGoodId, setIsVerifyingGoodId] = useState(false)
  const isStreamUpdateFlow = parseGAmount(streamSeed) > 0

  useEffect(() => {
    setStreamAmount(streamSeed)
  }, [streamSeed])

  useEffect(() => {
    let cancelled = false
    setQuotePending(true)
    void buildQuote(depositAmount, streamAmount)
      .then((nextQuote) => {
        if (!cancelled) setQuote(nextQuote)
      })
      .catch(() => {
        if (!cancelled) setQuote(null)
      })
      .finally(() => {
        if (!cancelled) setQuotePending(false)
      })
    return () => {
      cancelled = true
    }
  }, [depositAmount, streamAmount, buildQuote])

  const depositG = parseGAmount(depositAmount)
  const streamG = parseGAmount(streamAmount)
  const depositBonusLabel = isGoodIdVerified
    ? `+${depositBonusPercent}% bonus`
    : `Verify for +${depositBonusPercent}%`
  const streamBonusLabel = isGoodIdVerified
    ? `+${streamBonusPercent}% bonus`
    : `Verify for +${streamBonusPercent}%`
  const paymentValidation = useMemo(
    () =>
      getPaymentAmountValidation({
        depositAmount,
        streamAmount,
        minDepositUsd,
        minStreamUsd,
        quote,
        gdUsdPerToken,
        gBalance,
      }),
    [depositAmount, streamAmount, minDepositUsd, minStreamUsd, quote, gdUsdPerToken, gBalance],
  )
  const minsLoaded = minStreamUsd !== null
  const hasAmounts = depositG > 0 || streamG > 0
  const canPay =
    status === 'quote_ready' &&
    minsLoaded &&
    hasAmounts &&
    paymentValidation.vaultMinimumsMet &&
    !paymentValidation.overBalance &&
    !quotePending &&
    quote !== null
  const payDisabledMessage = getPayDisabledMessage({
    canPay,
    minsLoaded,
    status,
    minDepositUsd,
    minStreamUsd,
    validation: paymentValidation,
  })
  const { depositBelowMin, streamBelowMin, overBalance } = paymentValidation
  const depositMinUsdLabel =
    minDepositUsd !== null
      ? `Minimum ${formatMinUsdDisplay(minDepositUsd)} for your first deposit`
      : 'One-time deposit (no minimum after first deposit)'
  const streamMinUsdLabel = isStreamUpdateFlow
    ? `Current stream · min ${minStreamUsd !== null ? formatMinUsdDisplay(minStreamUsd) : '…'}/month`
    : minStreamUsd !== null
      ? `Minimum ${formatMinUsdDisplay(minStreamUsd)}/month`
      : 'Loading minimum…'
  const depositPlaceholder =
    minStreamUsd === null
      ? 'Loading minimum…'
      : minDepositUsd !== null
        ? `Min ${formatMinUsdDisplay(minDepositUsd)}`
        : '0 G$ (optional)'
  const streamPlaceholder =
    minStreamUsd === null
      ? 'Loading minimum…'
      : `Min ${formatMinUsdDisplay(minStreamUsd)}/mo`

  const effectiveDepositBonusPercent = getDepositBonusPercent(isGoodIdVerified, depositBonusPercent)
  const effectiveStreamBonusPercent = getStreamBonusPercent(isGoodIdVerified, streamBonusPercent)
  const depositEstUsd =
    quote && gdUsdPerToken !== null && depositG > 0
      ? formatUsdWithBonus(
          quoteDepositPrincipalUsd(quote, gdUsdPerToken),
          effectiveDepositBonusPercent,
        )
      : null
  const streamEstUsd =
    quote && gdUsdPerToken !== null && streamG > 0
      ? formatUsdWithBonus(
          quoteStreamPrincipalUsd(quote, gdUsdPerToken),
          effectiveStreamBonusPercent,
        )
      : null
  const usd1ToGLabel =
    gdUsdPerToken !== null ? formatUsd1ToG(gdUsdPerToken) : null

  const Shell = embedded ? YStack : Card

  return (
    <Shell gap="$3">
      <XStack justifyContent="space-between" alignItems="center" gap="$2">
        <Heading level={5}>Buy Credits</Heading>
        {usd1ToGLabel && (
          <Text fontSize="$2" secondary flexShrink={1} textAlign="right">
            US$1 ≈ {usd1ToGLabel} G$
          </Text>
        )}
      </XStack>

      <XStack justifyContent="space-between" alignItems="center">
        <Text variant="label" secondary>
          Your G$ Balance
        </Text>
        {gBalance !== null ? (
          <TokenAmount token="G$" amount={gBalance} size="sm" />
        ) : (
          <Spinner size="sm" />
        )}
      </XStack>

      <YStack gap="$1">
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">One-time Deposit (G$)</Text>
          <BonusLabel label={depositBonusLabel} active={isGoodIdVerified} />
        </XStack>
        <Input
          value={depositAmount}
          onChangeText={setDepositAmount}
          placeholder={depositPlaceholder}
          error={depositBelowMin}
        />
        <XStack justifyContent="space-between" alignItems="center" gap="$2">
          {depositG > 0 && depositEstUsd ? (
            <Text fontSize="$1" secondary>
              ≈ {depositEstUsd}
            </Text>
          ) : depositG > 0 && quotePending ? (
            <Spinner size="sm" />
          ) : (
            <YStack />
          )}
          <Text fontSize="$1" secondary textAlign="right" flexShrink={0}>
            {depositMinUsdLabel}
          </Text>
        </XStack>
      </YStack>

      <YStack gap="$1">
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">
            {isStreamUpdateFlow ? 'Update Monthly Stream (G$)' : 'Monthly Stream (G$)'}
          </Text>
          <BonusLabel label={streamBonusLabel} active={isGoodIdVerified} />
        </XStack>
        <Input
          value={streamAmount}
          onChangeText={setStreamAmount}
          placeholder={streamPlaceholder}
          error={streamBelowMin}
        />
        <XStack justifyContent="space-between" alignItems="center" gap="$2">
          {streamG > 0 && streamEstUsd ? (
            <Text fontSize="$1" secondary>
              ≈ {streamEstUsd}/month
            </Text>
          ) : streamG > 0 && quotePending ? (
            <Spinner size="sm" />
          ) : (
            <YStack />
          )}
          <Text fontSize="$1" secondary textAlign="right" flexShrink={0}>
            {streamMinUsdLabel}
          </Text>
        </XStack>
      </YStack>

      <Separator />

      {quote && gdUsdPerToken !== null && (
        <>
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="label">
              Est. credits
            </Text>
            <Text fontSize="$2" color="$primary" fontWeight="700">
              {formatMinUsdDisplay(quoteDepositPrincipalUsd(quote, gdUsdPerToken)) +
                ' + ' +
                formatMinUsdDisplay(quoteStreamPrincipalUsd(quote, gdUsdPerToken)) +
                '/month'}
            </Text>
          </XStack>

          <XStack justifyContent="space-between" alignItems="center" gap="$2">
            <Text fontSize="$1" flexShrink={0}>
              Bonuses
            </Text>
            <BonusSummaryValue
              quote={quote}
              gdUsdPerToken={gdUsdPerToken}
              isGoodIdVerified={isGoodIdVerified}
              depositBonusPercent={depositBonusPercent}
              streamBonusPercent={streamBonusPercent}
              isVerifyingGoodId={isVerifyingGoodId}
              onVerifyGoodId={async () => {
                setIsVerifyingGoodId(true)
                try {
                  await onVerifyGoodId()
                } finally {
                  setIsVerifyingGoodId(false)
                }
              }}
            />
          </XStack>
        </>
      )}

      {overBalance && (
        <AiCreditsStatusNotice borderColor="$warning">
          <Text color="$warning" fontSize="$2">
            Deposit amount exceeds your G$ balance. Reduce the deposit amount.
          </Text>
        </AiCreditsStatusNotice>
      )}

      {depositBelowMin && minDepositUsd && (
        <AiCreditsStatusNotice borderColor="$warning">
          <Text color="$warning" fontSize="$2">
            First deposit must be at least {formatMinUsdDisplay(minDepositUsd)}.
          </Text>
        </AiCreditsStatusNotice>
      )}

      {streamBelowMin && minStreamUsd && (
        <AiCreditsStatusNotice borderColor="$warning">
          <Text color="$warning" fontSize="$2">
            Monthly stream must be at least {formatMinUsdDisplay(minStreamUsd)}.
          </Text>
        </AiCreditsStatusNotice>
      )}

      <HoverTooltip message={payDisabledMessage} fullWidth>
        <Button
          fullWidth
          size="sm"
          {...compactButtonProps}
          disabled={!canPay || isPayPending}
          onPress={() => {
            if (quote) onPay(quote)
          }}
        >
          {isPayPending ? (
            <XStack gap="$2" alignItems="center">
              <ButtonText>Buy AI Credits</ButtonText>
              <Spinner size="sm" />
            </XStack>
          ) : (
            <ButtonText>Buy AI Credits</ButtonText>
          )}
        </Button>
      </HoverTooltip>
    </Shell>
  )
}
