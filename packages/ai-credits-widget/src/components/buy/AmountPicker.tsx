import { Button, ButtonText, Card, Heading, Input, Separator, Spinner, Text, TokenAmount, XStack, YStack } from '@goodwidget/ui'
import type { AiCreditsQuote } from '../../widgetRuntimeContract'
import { formatUsdWithBonus, parseGAmount } from '../../quoteMath'
import {
  formatMinGDisplayLocale,
  formatMinUsdDisplay,
  getPaymentAmountValidation,
} from '../../vaultMinimums'
import { AiCreditsStatusNotice, BonusBadgeFrame } from '../theme/cards'
import { HoverTooltip } from '../shared/tooltips'
import { compactButtonProps } from '../shared/styles'

interface AmountPickerProps {
  depositAmount: string
  streamAmount: string
  gBalance: string | null
  minDepositG: string | null
  minStreamG: string | null
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

function BonusLabel({ label, active }: { label: string; active: boolean }) {
  if (!active) {
    return (
      <Text fontSize="$1" secondary>
        {label}
      </Text>
    )
  }

  return (
    <BonusBadgeFrame backgroundColor="$backgroundPress">
      <Text fontSize="$2" fontWeight="700" color="$primary">
        {label}
      </Text>
    </BonusBadgeFrame>
  )
}

export function AmountPicker({
  depositAmount,
  streamAmount,
  gBalance,
  minDepositG,
  minStreamG,
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
  const depositBonusLabel = isGoodIdVerified ? '+10% bonus' : '+10% with GoodID'
  const streamBonusLabel = isGoodIdVerified ? '+20% bonus' : '+20% with GoodID'
  const { depositBelowMin, streamBelowMin, overBalance } = getPaymentAmountValidation({
    depositAmount,
    streamAmount,
    minDepositG,
    minStreamG,
    gBalance,
  })
  const depositMinG = minDepositG !== null ? parseGAmount(minDepositG) : 0
  const streamMinG = minStreamG !== null ? parseGAmount(minStreamG) : 0
  const depositMinUsdLabel =
    minDepositUsd !== null
      ? depositMinG > 0
        ? `Minimum ${formatMinUsdDisplay(minDepositUsd)} first deposit`
        : 'One-time deposit optional (no minimum after your first deposit)'
      : 'Loading minimum…'
  const streamMinUsdLabel =
    minStreamUsd !== null
      ? streamMinG > 0
        ? `Optional — minimum ${formatMinUsdDisplay(minStreamUsd)}/month if set`
        : 'Monthly stream optional'
      : 'Loading minimum…'
  const depositPlaceholder =
    minDepositG === null
      ? 'Loading minimum…'
      : depositMinG > 0
        ? `Min ${formatMinUsdDisplay(minDepositUsd ?? '1.00')}`
        : '0 G$ (optional)'
  const streamPlaceholder =
    minStreamG === null
      ? 'Loading minimum…'
      : streamMinG > 0
        ? `Min ${formatMinUsdDisplay(minStreamUsd ?? '1.00')}/mo`
        : '0 G$ (optional)'

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
              ≈ ${depositEstUsd} USD
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
              ≈ ${streamEstUsd} USD/month
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

      <XStack justifyContent="space-between" alignItems="center">
        <Text variant="label">One-time total</Text>
        <TokenAmount token="G$" amount={depositG.toFixed(2)} size="md" />
      </XStack>

      <XStack justifyContent="space-between" alignItems="center">
        <Text variant="label">Monthly stream</Text>
        <XStack alignItems="center" gap="$1">
          <TokenAmount token="G$" amount={streamG.toFixed(2)} size="md" />
          {streamG > 0 && (
            <Text fontSize="$2" secondary>
              /month
            </Text>
          )}
        </XStack>
      </XStack>

      {quote && (
        <>
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="label" secondary>
              Est. credits
            </Text>
            <Text fontSize="$2" color="$primary" fontWeight="700">
              {formatMinUsdDisplay(quote.totalCreditsUsd)}
            </Text>
          </XStack>

          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$1" secondary>
              Deposit bonus
            </Text>
            <Text fontSize="$2" fontWeight="700" color="$primary">
              {formatMinUsdDisplay(quote.depositBonusUsd)}
            </Text>
          </XStack>

          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$1" secondary>
              Stream bonus
            </Text>
            <Text fontSize="$2" fontWeight="700" color="$primary">
              {formatMinUsdDisplay(quote.streamBonusUsd)}/month
            </Text>
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

      {depositBelowMin && minDepositG && minDepositUsd && (
        <AiCreditsStatusNotice borderColor="$warning">
          <Text color="$warning" fontSize="$2">
            First deposit must be at least {formatMinUsdDisplay(minDepositUsd)} (about{' '}
            {formatMinGDisplayLocale(minDepositG)} G$).
          </Text>
        </AiCreditsStatusNotice>
      )}

      {streamBelowMin && minStreamG && minStreamUsd && (
        <AiCreditsStatusNotice borderColor="$warning">
          <Text color="$warning" fontSize="$2">
            Monthly stream must be at least {formatMinUsdDisplay(minStreamUsd)} (about{' '}
            {formatMinGDisplayLocale(minStreamG)} G$).
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
