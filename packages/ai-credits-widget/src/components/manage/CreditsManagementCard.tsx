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
import type { AiCreditsWidgetAdapterActions, AiCreditsWidgetAdapterState } from '../../widgetRuntimeContract'
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
    <YStack
      flex={1}
      minWidth="45%"
      gap="$1"
      backgroundColor="$backgroundHover"
      borderRadius="$2"
      padding="$2"
      $gtSm={{
        minWidth: '28%',
      }}
    >
      <Text fontSize="$1" secondary>
        {label}
      </Text>
      <YStack justifyContent="center">
        {children}
      </YStack>
    </YStack>
  )
}

function StatValueText({
  children,
  color,
}: {
  children: React.ReactNode
  color?: string
}) {
  return (
    <Text fontSize="$2" fontWeight="700" color={color}>
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
    buyerPrvKey,
  } = state

  const monthlyStreamUsdDisplay = useMemo(() => {
    if (!monthlyStreamG || !gdUsdPerToken) return null
    if (Number.parseFloat(monthlyStreamG) <= 0) return null
    const quote = { depositAmountG: '0', streamAmountG: monthlyStreamG }
    const usdMicro = quoteTotalUsdMicro(quote, gdUsdPerToken, isGoodIdVerified)
    if (usdMicro <= 0n) return null
    return formatUsdAmount(usdMicro.toString())
  }, [monthlyStreamG, gdUsdPerToken, isGoodIdVerified])

  const totalCreditDisplay =
    totalCreditUsd && BigInt(totalCreditUsd) > 0n
      ? formatUsdAmount(totalCreditUsd)
      : totalCreditUsd !== null
        ? formatUsdAmount('0')
        : null

  const withdrawableDisplay =
    withdrawableUsd !== null ? formatUsdAmount(withdrawableUsd) : null
  const hasWithdrawableBalance =
    withdrawableUsd !== null && BigInt(withdrawableUsd) > 0n
  const canClose = Boolean(buyerPrvKey) && Boolean(channelId.trim()) && !isClosing
  const canWithdraw =
    Boolean(buyerPrvKey) &&
    hasWithdrawableBalance &&
    Boolean(withdrawAmount.trim()) &&
    !isWithdrawing

  return (
    <Card gap="$3">
      <Heading level={6}>AI Credits</Heading>

      <XStack gap="$4" width="100%" alignItems="flex-start" flexWrap="wrap">
        <YStack gap="$2" flex={1} minWidth={0}>
          <Text fontSize="$1" secondary>
            Total Credit (US$)
          </Text>
          {totalCreditDisplay !== null ? (
            <Heading level={5}>{totalCreditDisplay}</Heading>
          ) : (
            <Spinner size="sm" />
          )}
        </YStack>
        <YStack gap="$2" flex={1} minWidth={0}>
          <Text fontSize="$1" secondary>
            Est. Monthly Credit (US$)
          </Text>
          {monthlyStreamUsdDisplay ? (
            <Heading level={5} color="$primary">
              ~{monthlyStreamUsdDisplay}
            </Heading>
          ) : (
            <Heading level={5}>—</Heading>
          )}
        </YStack>
      </XStack>

      <XStack gap="$2" width="100%" flexWrap="wrap" alignItems="stretch">
          <StatCell label="Total Deposited (G$)">
            <StatValueText>{formatCompactAmount(totalGdDepositedG ?? '0.00')}</StatValueText>
          </StatCell>
          <StatCell label="Monthly Stream (G$)">
            <StatValueText>{formatCompactAmount(monthlyStreamG ?? '0.00')}</StatValueText>
          </StatCell>
          <StatCell label="Withdrawable (US$)">
            {withdrawableDisplay !== null ? (
              <StatValueText>{withdrawableDisplay}</StatValueText>
            ) : (
              <Spinner size="sm" />
            )}
          </StatCell>
      </XStack>

      <YStack gap="$1">
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
