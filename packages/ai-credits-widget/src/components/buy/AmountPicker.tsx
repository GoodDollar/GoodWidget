import { Button, ButtonText, Card, Heading, Input, Separator, Spinner, Text, TokenAmount, XStack, YStack } from '@goodwidget/ui'
import type { AiCreditsQuote } from '../../widgetRuntimeContract'
import { parseGAmount } from '../../quoteMath'
import { formatMinGDisplayLocale, getPaymentAmountValidation } from '../../vaultMinimums'
import { AiCreditsStatusNotice, BonusBadgeFrame } from '../theme/cards'
import { HoverTooltip } from '../shared/tooltips'
import { compactButtonProps } from '../shared/styles'

interface AmountPickerProps {
  depositAmount: string
  streamAmount: string
  gBalance: string | null
  minDepositG: string | null
  minStreamG: string | null
  quote: AiCreditsQuote | null
  isGoodIdVerified: boolean
  bonusPercent: number
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
  minDepositG,
  minStreamG,
  quote,
  isGoodIdVerified,
  bonusPercent,
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
  const appliedBonusPercent = quote?.bonusPercent ?? bonusPercent
  const depositBonusLabel = isGoodIdVerified ? '+10% bonus' : '+10% with GoodID'
  const streamBonusLabel = isGoodIdVerified ? '+20% bonus (GoodID)' : '+20% with GoodID'
  const { depositBelowMin, streamBelowMin, overBalance } = getPaymentAmountValidation({
    depositAmount,
    streamAmount,
    minDepositG,
    minStreamG,
    gBalance,
  })
  const totalG = depositG + streamG
  const depositPlaceholder =
    minDepositG === null
      ? 'Loading minimum…'
      : parseGAmount(minDepositG) > 0
        ? `Min ${formatMinGDisplayLocale(minDepositG)} G$`
        : '0 G$ (optional)'
  const streamPlaceholder =
    minStreamG === null
      ? 'Loading minimum…'
      : `Min ${formatMinGDisplayLocale(minStreamG)} G$ (optional)`

  const formatCredits = (value: string) => {
    const parsed = Number.parseFloat(value)
    return parsed < 10 ? parsed.toFixed(1) : parsed.toFixed(2)
  }

  const Shell = embedded ? YStack : Card

  return (
    <Shell gap="$3">
      <Heading level={5}>Buy Credits</Heading>

      <YStack gap="$1">
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">One-time Deposit (G$)</Text>
          <Text fontSize="$1" secondary>
            {depositBonusLabel}
          </Text>
        </XStack>
        <Input
          value={depositAmount}
          onChangeText={onDepositChange}
          placeholder={depositPlaceholder}
          error={depositBelowMin}
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
            {streamBonusLabel}
          </Text>
        </XStack>
        <Input
          value={streamAmount}
          onChangeText={onStreamChange}
          placeholder={streamPlaceholder}
          error={streamBelowMin}
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
          {appliedBonusPercent > 0 ? (
            <Text fontSize="$2" fontWeight="700" color="$primary">
              +{appliedBonusPercent}%
            </Text>
          ) : (
            <Text fontSize="$2" fontWeight="700" secondary>
              No bonus
            </Text>
          )}
        </BonusBadgeFrame>
      </XStack>

      {overBalance && (
        <AiCreditsStatusNotice borderColor="$warning">
          <Text color="$warning" fontSize="$2">
            Total exceeds your G$ balance. Reduce the amounts.
          </Text>
        </AiCreditsStatusNotice>
      )}

      {depositBelowMin && minDepositG && (
        <AiCreditsStatusNotice borderColor="$warning">
          <Text color="$warning" fontSize="$2">
            First deposit must be at least {formatMinGDisplayLocale(minDepositG)} G$.
          </Text>
        </AiCreditsStatusNotice>
      )}

      {streamBelowMin && minStreamG && (
        <AiCreditsStatusNotice borderColor="$warning">
          <Text color="$warning" fontSize="$2">
            Monthly stream must be at least {formatMinGDisplayLocale(minStreamG)} G$.
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

