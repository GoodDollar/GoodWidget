import React, { useMemo, useState } from 'react'
import {
  Button,
  ButtonText,
  Card,
  Coins,
  Gift,
  Heading,
  Input,
  Repeat,
  Spinner,
  Text,
  TrendingUp,
  Wallet,
  XStack,
  YStack,
} from '@goodwidget/ui'
import type {
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterState,
} from '../../widgetRuntimeContract'
import { quoteTotalUsdMicro } from '../../quoteMath'
import {
  formatExactGAmount,
  formatGValue,
  formatUsdMicroAmount,
  formatUsdMicroValue,
  isGValueCompacted,
} from '../../format'
import {
  BUYER_KEY_REQUIRED_CLOSE_TOOLTIP,
  BUYER_KEY_REQUIRED_WITHDRAW_TOOLTIP,
  WITHDRAW_TOOLTIP,
} from '../shared/constants'
import { HoverTooltip, InfoTooltip } from '../shared/tooltips'
import { compactButtonProps } from '../shared/styles'

interface CreditsManagementCardProps {
  state: AiCreditsWidgetAdapterState
  actions: Pick<AiCreditsWidgetAdapterActions, 'closeChannel' | 'withdrawCredits'>
}

/** Lucide glyph a stat cell shows in the chip above its label. */
type StatGlyph = React.ComponentType<{ size?: number; color?: string }>

function StatCell({
  label,
  icon: Glyph,
  children,
}: {
  label: string
  icon?: StatGlyph
  children: React.ReactNode
}) {
  return (
    <Card
      raised
      borderWidth={0}
      flexGrow={1}
      flexBasis={0}
      padding="$3"
      // Two groups, not three siblings: the glyph sits apart, and the label
      // binds tight to the number it names.
      gap="$1"
    >
      {Glyph ? (
        <XStack
          width={28}
          height={28}
          borderRadius="$2"
          backgroundColor="$background"
          alignItems="center"
          justifyContent="center"
        >
          <Glyph size={16} color="$colorSoft" />
        </XStack>
      ) : null}
      <YStack>
        <Text fontSize="$1" tone="soft">
          {label}
        </Text>
        {children}
      </YStack>
    </Card>
  )
}

/** One row of stat cards. Pairs are explicit so widths never depend on wrapping. */
function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <XStack gap="$1" width="100%" alignItems="stretch">
      {children}
    </XStack>
  )
}

function StatValueText({
  children,
  color,
  fontSize = '$2',
}: {
  children: React.ReactNode
  color?: string
  /** `$5` matches Heading level 5, used by the two headline stats. */
  fontSize?: string
}) {
  return (
    <Text fontSize={fontSize} fontWeight="700" color={color}>
      {children}
    </Text>
  )
}

/**
 * A stat's number with its unit alongside, the unit set smaller and softer so
 * the digits stay the thing you read first.
 */
function StatValue({
  value,
  unit,
  unitPosition,
  fontSize = '$2',
  unitFontSize = '$1',
  color,
}: {
  value: string
  unit: string
  unitPosition: 'prefix' | 'suffix'
  fontSize?: string
  unitFontSize?: string
  color?: string
}) {
  // Dust amounts format as `<0.01`. With a prefixed symbol the marker has to
  // travel with the unit so it reads `<US$0.01`, never `US$<0.01`. A suffixed
  // unit already keeps them adjacent (`<0.01 G$`).
  const hoistMarker = unitPosition === 'prefix' && value.startsWith('<')
  const unitLabel = hoistMarker ? `<${unit}` : unit
  const digits = hoistMarker ? value.slice(1) : value

  const unitText = (
    <Text fontSize={unitFontSize} fontWeight="700" tone="soft">
      {unitLabel}
    </Text>
  )

  return (
    <XStack alignItems="baseline" gap="$1">
      {unitPosition === 'prefix' ? unitText : null}
      <StatValueText fontSize={fontSize} color={color}>
        {digits}
      </StatValueText>
      {unitPosition === 'suffix' ? unitText : null}
    </XStack>
  )
}

function CompactGStatValue({ amount }: { amount: string }) {
  const [open, setOpen] = useState(false)
  const display = formatGValue(amount)
  const exact = formatExactGAmount(amount)
  // Only abbreviated amounts hide digits, so only those need the exact value.
  if (!isGValueCompacted(amount)) {
    return <StatValue value={display} unit="G$" unitPosition="suffix" />
  }

  return (
    <XStack
      position="relative"
      cursor="help"
      alignItems="center"
      tabIndex={0}
      accessibilityLabel={exact}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onPress={() => setOpen((prev) => !prev)}
    >
      <StatValue value={display} unit="G$" unitPosition="suffix" />
      {open && (
        <YStack
          position="absolute"
          bottom="100%"
          left={0}
          marginBottom="$1"
          backgroundColor="$background"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$2"
          padding="$2"
          zIndex={100}
          pointerEvents="none"
        >
          <Text fontSize="$1" lineHeight="$2" color="$color" whiteSpace="nowrap">
            {exact}
          </Text>
        </YStack>
      )}
    </XStack>
  )
}

/** Stat cells render the currency beside the number, so the value stays bare. */
function formatUsdAmount(usdMicro: string): string {
  return formatUsdMicroValue(usdMicro)
}

/**
 * Headline balance: full width, with the monthly credit as a pill underneath
 * rather than its own cell, so the number you check most has the whole row.
 */
function CreditBalanceCard({
  balance,
  monthlyCredit,
}: {
  balance: string | null
  /** Already carries its `US$` symbol — the pill sets it inline, not alongside. */
  monthlyCredit: string | null
}) {
  return (
    <Card raised borderWidth={0} width="100%" gap="$2">
      <Text fontSize="$1" tone="soft">
        Credit balance
      </Text>
      {balance !== null ? (
        <StatValue
          value={balance}
          unit="US$"
          unitPosition="prefix"
          fontSize="$8"
          unitFontSize="$5"
        />
      ) : (
        <Spinner size="sm" />
      )}
      {monthlyCredit ? (
        <XStack
          alignSelf="flex-start"
          alignItems="center"
          gap="$1"
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius="$full"
          backgroundColor="$infoMuted"
        >
          <TrendingUp size={14} color="$primary" />
          <Text fontSize="$1" fontWeight="700" color="$primary">
            {/* `<US$0.01` is already an approximation; a `~` on top reads as noise. */}
            {monthlyCredit.startsWith('<') ? monthlyCredit : `~${monthlyCredit}`} / month
          </Text>
        </XStack>
      ) : null}
    </Card>
  )
}

export function CreditsManagementCard({ state, actions }: CreditsManagementCardProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [channelId, setChannelId] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const {
    totalCreditUsd,
    totalGdDepositedG,
    monthlyStreamG,
    gdUsdPerToken,
    isGoodIdVerified,
    withdrawableUsd,
    totalBonusUsd,
    signerPrvKey,
  } = state

  const monthlyStreamUsdDisplay = useMemo(() => {
    if (!monthlyStreamG || !gdUsdPerToken) return null
    if (Number.parseFloat(monthlyStreamG) <= 0) return null
    const quote = { depositAmountG: '0', streamAmountG: monthlyStreamG }
    const usdMicro = quoteTotalUsdMicro(quote, gdUsdPerToken, isGoodIdVerified, {
      depositBonusPercent: state.depositBonusPercent,
      streamBonusPercent: state.streamBonusPercent,
    })
    if (usdMicro <= 0n) return null
    return formatUsdMicroAmount(usdMicro.toString())
  }, [
    monthlyStreamG,
    gdUsdPerToken,
    isGoodIdVerified,
    state.depositBonusPercent,
    state.streamBonusPercent,
  ])

  const totalCreditDisplay =
    totalCreditUsd && BigInt(totalCreditUsd) > 0n
      ? formatUsdAmount(totalCreditUsd)
      : totalCreditUsd !== null
        ? formatUsdAmount('0')
        : null

  const withdrawableDisplay = withdrawableUsd !== null ? formatUsdAmount(withdrawableUsd) : null
  const totalBonusDisplay = totalBonusUsd !== null ? formatUsdAmount(totalBonusUsd) : null
  const hasWithdrawableBalance = withdrawableUsd !== null && BigInt(withdrawableUsd) > 0n
  const canClose = Boolean(signerPrvKey) && Boolean(channelId.trim()) && !isClosing
  const canWithdraw =
    Boolean(signerPrvKey) &&
    hasWithdrawableBalance &&
    Boolean(withdrawAmount.trim()) &&
    !isWithdrawing

  return (
    <Card>
      <Heading level={6}>AI Credits</Heading>

      {/* The stat grid keeps its own tighter rhythm than the form sections below. */}
      <YStack gap="$2" width="100%">
        <CreditBalanceCard balance={totalCreditDisplay} monthlyCredit={monthlyStreamUsdDisplay} />

        <StatRow>
          <StatCell label="Deposited" icon={Coins}>
            <CompactGStatValue amount={totalGdDepositedG ?? '0.00'} />
          </StatCell>
          <StatCell label="Monthly Streaming" icon={Repeat}>
            <CompactGStatValue amount={monthlyStreamG ?? '0.00'} />
          </StatCell>
        </StatRow>

        <StatRow>
          <StatCell label="Bonus" icon={Gift}>
            {totalBonusDisplay !== null ? (
              <StatValue value={totalBonusDisplay} unit="US$" unitPosition="prefix" />
            ) : (
              <Spinner size="sm" />
            )}
          </StatCell>
          <StatCell label="Withdrawable" icon={Wallet}>
            {withdrawableDisplay !== null ? (
              <StatValue value={withdrawableDisplay} unit="US$" unitPosition="prefix" />
            ) : (
              <Spinner size="sm" />
            )}
          </StatCell>
        </StatRow>
      </YStack>

      <YStack gap="$1" width="100%">
        <XStack gap="$1" alignItems="center">
          <Text fontSize="$1" variant="label">
            Withdraw
          </Text>
          <InfoTooltip message={WITHDRAW_TOOLTIP} />
        </XStack>
        <XStack gap="$2" alignItems="center">
          <YStack flex={1}>
            <Input
              size="sm"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholder={
                hasWithdrawableBalance && withdrawableDisplay
                  ? `Max ${withdrawableDisplay} US$`
                  : 'Amount in US$'
              }
            />
          </YStack>
          <HoverTooltip message={!signerPrvKey ? BUYER_KEY_REQUIRED_WITHDRAW_TOOLTIP : null}>
            <Button
              variant="outline"
              size="sm"
              minWidth="$14"
              flexShrink={0}
              disabled={!canWithdraw}
              {...compactButtonProps}
              onPress={() => {
                setIsWithdrawing(true)
                void Promise.resolve(actions.withdrawCredits(withdrawAmount)).finally(() => {
                  setIsWithdrawing(false)
                  setWithdrawAmount('')
                })
              }}
            >
              <ButtonText>{isWithdrawing ? 'Withdrawing…' : 'Withdraw'}</ButtonText>
            </Button>
          </HoverTooltip>
        </XStack>
      </YStack>

      <YStack gap="$1">
        <Text fontSize="$1" variant="label">
          Close Channel
        </Text>
        <XStack gap="$2" alignItems="center">
          <YStack flex={1}>
            <Input
              size="sm"
              value={channelId}
              onChangeText={setChannelId}
              placeholder="0x… (64 hex chars)"
            />
          </YStack>
          <HoverTooltip message={!signerPrvKey ? BUYER_KEY_REQUIRED_CLOSE_TOOLTIP : null}>
            <Button
              variant="outline"
              size="sm"
              minWidth="$14"
              flexShrink={0}
              disabled={!canClose}
              {...compactButtonProps}
              onPress={() => {
                setIsClosing(true)
                void Promise.resolve(actions.closeChannel(channelId)).finally(() => {
                  setIsClosing(false)
                  setChannelId('')
                })
              }}
            >
              <ButtonText>{isClosing ? 'Closing…' : 'Close'}</ButtonText>
            </Button>
          </HoverTooltip>
        </XStack>
      </YStack>
    </Card>
  )
}
