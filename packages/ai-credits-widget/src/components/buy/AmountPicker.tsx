import React, { useEffect, useMemo, useState } from 'react'
import { Button, ButtonText, Card, Heading, Input, Separator, Spinner, Text, TokenAmount, XStack, YStack } from '@goodwidget/ui'
import type { AiCreditsQuote, AiCreditsWidgetStatus } from '../../widgetRuntimeContract'
import {
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
}: {
  quote: AiCreditsQuote
  gdUsdPerToken: number
  isGoodIdVerified: boolean
}) {
  if (!isGoodIdVerified) {
    return (
      <BonusBadgeFrame backgroundColor="$warningMuted" borderWidth={1} borderColor="$warning">
        <Text fontSize="$1" fontWeight="700" lineHeight={16} color="$warning">
          no bonus
        </Text>
      </BonusBadgeFrame>
    )
  }

  return (
    <Text fontSize="$2" fontWeight="700" color="$success">
      {formatMinUsdDisplay(quoteDepositBonusUsd(quote, gdUsdPerToken, isGoodIdVerified)) +
        ' + ' +
        formatMinUsdDisplay(quoteStreamBonusUsd(quote, gdUsdPerToken, isGoodIdVerified)) +
        '/month'}
    </Text>
  )
}

interface AmountPickerProps {
  status: AiCreditsWidgetStatus
  gBalance: string | null
  minDepositUsd: string | null
  minStreamUsd: string | null
  gdUsdPerToken: number | null
  isGoodIdVerified: boolean
  isPayPending: boolean
  buildQuote: (depositG: string, streamG: string) => Promise<AiCreditsQuote>
  onPay: (quote: AiCreditsQuote) => void
  embedded?: boolean
}

export function AmountPicker({
  status,
  gBalance,
  minDepositUsd,
  minStreamUsd,
  gdUsdPerToken,
  isGoodIdVerified,
  isPayPending,
  buildQuote,
  onPay,
  embedded = false,
}: AmountPickerProps) {
  const [depositAmount, setDepositAmount] = useState(DEFAULT_DEPOSIT_AMOUNT)
  const [streamAmount, setStreamAmount] = useState(DEFAULT_STREAM_AMOUNT)
  const [quote, setQuote] = useState<AiCreditsQuote | null>(null)
  const [quotePending, setQuotePending] = useState(false)

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
  const depositBonusLabel = isGoodIdVerified ? '+10% bonus' : 'no bonus'
  const streamBonusLabel = isGoodIdVerified ? '+20% bonus' : 'no bonus'
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
    minStreamUsd === null
      ? 'Loading minimum…'
      : minDepositUsd !== null
        ? `Minimum ${formatMinUsdDisplay(minDepositUsd)} for your first deposit`
        : 'One-time deposit (no minimum after first deposit)'
  const streamMinUsdLabel =
    minStreamUsd !== null
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

  const depositBonusPercent = getDepositBonusPercent(isGoodIdVerified)
  const streamBonusPercent = getStreamBonusPercent(isGoodIdVerified)
  const depositEstUsd =
    quote && gdUsdPerToken !== null && depositG > 0
      ? formatUsdWithBonus(quoteDepositPrincipalUsd(quote, gdUsdPerToken), depositBonusPercent)
      : null
  const streamEstUsd =
    quote && gdUsdPerToken !== null && streamG > 0
      ? formatUsdWithBonus(quoteStreamPrincipalUsd(quote, gdUsdPerToken), streamBonusPercent)
      : null

  const Shell = embedded ? YStack : Card

  return (
    <Shell gap="$3">
      <Heading level={5}>Buy Credits</Heading>

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
          <Text variant="label">Monthly Stream (G$)</Text>
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

          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$1">
              Bonuses
            </Text>
            <BonusSummaryValue
              quote={quote}
              gdUsdPerToken={gdUsdPerToken}
              isGoodIdVerified={isGoodIdVerified}
            />
          </XStack>
        </>
      )}

      {overBalance && (
        <AiCreditsStatusNotice borderColor="$warning">
          <Text color="$warning" fontSize="$2">
            Total exceeds your G$ balance. Reduce the amounts.
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
