import React, { useMemo, useState } from 'react'
import {
  Button,
  ButtonText,
  Card,
  Heading,
  Input,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@goodwidget/ui'
import type {
  AiCreditsWidgetAdapterActions,
  AiCreditsWidgetAdapterState,
} from '../../widgetRuntimeContract'
import { formatUsdMicro, quoteTotalUsdMicro } from '../../quoteMath'
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

function StatCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card raised borderWidth={0} flexGrow={1} flexBasis={0}>
      <Text fontSize="$1" tone="soft">
        {label}
      </Text>
      <YStack justifyContent="center">{children}</YStack>
    </Card>
  )
}

/** One row of stat cards. Pairs are explicit so widths never depend on wrapping. */
function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <XStack gap="$2" width="100%" alignItems="stretch">
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

function formatCompactAmount(amount: string): string {
  const value = Number.parseFloat(amount)
  if (!Number.isFinite(value) || value < 0) return '0'
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatExactGAmount(amount: string): string {
  const value = Number.parseFloat(amount)
  if (!Number.isFinite(value) || value < 0) return '0 G$'
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} G$`
}

function CompactGStatValue({ amount }: { amount: string }) {
  const [open, setOpen] = useState(false)
  const value = Number.parseFloat(amount)
  const compact = formatCompactAmount(amount)
  const exact = formatExactGAmount(amount)
  const needsExact = Number.isFinite(value) && value >= 1000

  if (!needsExact) {
    return <StatValueText>{compact}</StatValueText>
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
      <StatValueText>{compact}</StatValueText>
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

function formatUsdAmount(usdMicro: string): string {
  const value = Number.parseFloat(formatUsdMicro(usdMicro))
  if (!Number.isFinite(value) || value < 0) return '0.0000'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value)
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
    buyerPrvKey,
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
    return formatUsdAmount(usdMicro.toString())
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
  const canClose = Boolean(buyerPrvKey) && Boolean(channelId.trim()) && !isClosing
  const canWithdraw =
    Boolean(buyerPrvKey) &&
    hasWithdrawableBalance &&
    Boolean(withdrawAmount.trim()) &&
    !isWithdrawing

  return (
    <Card>
      <Heading level={6}>AI Credits</Heading>

      <StatRow>
        <StatCell label="Total Credit (US$)">
          {totalCreditDisplay !== null ? (
            <StatValueText fontSize="$5">{totalCreditDisplay}</StatValueText>
          ) : (
            <Spinner size="sm" />
          )}
        </StatCell>
        <StatCell label="Monthly Credit (US$)">
          {monthlyStreamUsdDisplay ? (
            <StatValueText fontSize="$5" color="$primary">
              ~{monthlyStreamUsdDisplay}
            </StatValueText>
          ) : (
            <StatValueText fontSize="$5">—</StatValueText>
          )}
        </StatCell>
      </StatRow>

      <StatRow>
        <StatCell label="Total Deposited (G$)">
          <CompactGStatValue amount={totalGdDepositedG ?? '0.00'} />
        </StatCell>
        <StatCell label="Monthly Stream (G$)">
          <CompactGStatValue amount={monthlyStreamG ?? '0.00'} />
        </StatCell>
      </StatRow>

      <StatRow>
        <StatCell label="Bonus Earned (US$)">
          {totalBonusDisplay !== null ? (
            <StatValueText>{totalBonusDisplay}</StatValueText>
          ) : (
            <Spinner size="sm" />
          )}
        </StatCell>
        <StatCell label="Withdrawable (US$)">
          {withdrawableDisplay !== null ? (
            <StatValueText>{withdrawableDisplay}</StatValueText>
          ) : (
            <Spinner size="sm" />
          )}
        </StatCell>
      </StatRow>

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
          <HoverTooltip message={!buyerPrvKey ? BUYER_KEY_REQUIRED_WITHDRAW_TOOLTIP : null}>
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
          <HoverTooltip message={!buyerPrvKey ? BUYER_KEY_REQUIRED_CLOSE_TOOLTIP : null}>
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
