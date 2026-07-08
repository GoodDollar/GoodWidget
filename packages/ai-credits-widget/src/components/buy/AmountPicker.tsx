import { Button, ButtonText, Card, Heading, Input, Separator, Spinner, Text, TokenAmount, XStack, YStack } from '@goodwidget/ui'
import type { AiCreditsQuote } from '../../widgetRuntimeContract'
import { formatUsdWithBonus, parseGAmount } from '../../quoteMath'
import {
  formatMinUsdDisplay,
  getPaymentAmountValidation,
} from '../../vaultMinimums'
import { AiCreditsStatusNotice, BonusBadgeFrame } from '../theme/cards'
import { HoverTooltip } from '../shared/tooltips'
import { compactButtonProps } from '../shared/styles'

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
  isGoodIdVerified,
}: {
  quote: AiCreditsQuote
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
      {formatMinUsdDisplay(quote.depositBonusUsd) +
        ' + ' +
        formatMinUsdDisplay(quote.streamBonusUsd) +
        '/month'}
    </Text>
  )
}

interface AmountPickerProps {
  depositAmount: string
  streamAmount: string
  gBalance: string | null
  minDepositUsd: string | null
  minStreamUsd: string | null
  quote: AiCreditsQuote | null
  isGoodIdVerified: boolean
  canPay: boolean
  payDisabledMessage: string | null
  isPayPending: boolean
  onDepositChange: (v: string) => void
  onStreamChange: (v: string) => void
  onPay: () => void
  embedded?: boolean
}

export function AmountPicker({
  depositAmount,
  streamAmount,
  gBalance,
  minDepositUsd,
  minStreamUsd,
  quote,
  isGoodIdVerified,
  canPay,
  payDisabledMessage,
  isPayPending,
  onDepositChange,
  onStreamChange,
  onPay,
  embedded = false,
}: AmountPickerProps) {
  const depositG = parseGAmount(depositAmount)
  const streamG = parseGAmount(streamAmount)
  const depositBonusLabel = isGoodIdVerified ? '+10% bonus' : 'no bonus'
  const streamBonusLabel = isGoodIdVerified ? '+20% bonus' : 'no bonus'
  const { depositBelowMin, streamBelowMin, overBalance } = getPaymentAmountValidation({
    depositAmount,
    streamAmount,
    minDepositUsd,
    minStreamUsd,
    quote,
    gBalance,
  })
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

  const depositBonusPercent = isGoodIdVerified ? 10 : 0
  const streamBonusPercent = isGoodIdVerified ? 20 : 0
  const depositEstUsd =
    quote && depositG > 0
      ? formatUsdWithBonus(quote.depositAmountUsd, depositBonusPercent)
      : null
  const streamEstUsd =
    quote && streamG > 0 ? formatUsdWithBonus(quote.streamAmountUsd, streamBonusPercent) : null

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
          onChangeText={onDepositChange}
          placeholder={depositPlaceholder}
          error={depositBelowMin}
        />
        <XStack justifyContent="space-between" alignItems="center" gap="$2">
          {depositG > 0 && depositEstUsd ? (
            <Text fontSize="$1" secondary>
              ≈ {depositEstUsd}
            </Text>
          ) : depositG > 0 && !quote ? (
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
          onChangeText={onStreamChange}
          placeholder={streamPlaceholder}
          error={streamBelowMin}
        />
        <XStack justifyContent="space-between" alignItems="center" gap="$2">
          {streamG > 0 && streamEstUsd ? (
            <Text fontSize="$1" secondary>
              ≈ {streamEstUsd}/month
            </Text>
          ) : streamG > 0 && !quote ? (
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

      {quote && (
        <>
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="label">
              Est. credits
            </Text>
            <Text fontSize="$2" color="$primary" fontWeight="700">
              {formatMinUsdDisplay(quote.depositAmountUsd) + " + " + formatMinUsdDisplay(quote.streamAmountUsd) + "/month"}
            </Text>
          </XStack>

          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$1">
              Bonuses
            </Text>
            <BonusSummaryValue quote={quote} isGoodIdVerified={isGoodIdVerified} />
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
            onPay()
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
