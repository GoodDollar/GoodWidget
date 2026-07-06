import React, { useState } from 'react'
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
import { formatUsdMicro } from '../../quoteMath'
import {
  BUYER_KEY_REQUIRED_CLOSE_TOOLTIP,
  BUYER_KEY_REQUIRED_WITHDRAW_TOOLTIP,
  WITHDRAW_TOOLTIP,
} from '../shared/constants'
import { HoverTooltip, InfoTooltip } from '../shared/tooltips'
import { compactButtonProps } from '../shared/styles'

interface CreditsManagementCardProps {
  state: AiCreditsWidgetAdapterState
  actions: Pick<
    AiCreditsWidgetAdapterActions,
    'setChannelId' | 'setWithdrawAmount' | 'closeChannel' | 'withdrawCredits'
  >
}

function StatCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <YStack
      flex={1}
      flexBasis={0}
      gap="$1"
      minWidth={0}
      backgroundColor="$backgroundHover"
      borderRadius="$2"
      padding="$2"
    >
      <Text fontSize="$1" secondary numberOfLines={2} minHeight={32}>
        {label}
      </Text>
      <YStack minHeight={20} justifyContent="center">
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
    <Text fontSize="$2" fontWeight="700" numberOfLines={1} color={color}>
      {children}
    </Text>
  )
}

function formatCompactG(amount: string): string {
  const value = Number.parseFloat(amount)
  if (!Number.isFinite(value)) return '0 G$'
  const formatted = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value)
  return `${formatted} G$`
}

export function CreditsManagementCard({ state, actions }: CreditsManagementCardProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const {
    aiCreditsBalance,
    gBalance,
    totalGdDepositedG,
    monthlyStreamG,
    monthlyStreamCredits,
    withdrawableUsd,
    buyerKeyPrivate,
    channelId,
    withdrawAmount,
  } = state

  const withdrawableDisplay =
    withdrawableUsd && BigInt(withdrawableUsd) > 0n ? formatUsdMicro(withdrawableUsd) : null
  const canClose = Boolean(buyerKeyPrivate) && Boolean(channelId.trim()) && !isClosing
  const canWithdraw =
    Boolean(buyerKeyPrivate) &&
    Boolean(withdrawableDisplay) &&
    Boolean(withdrawAmount.trim()) &&
    !isWithdrawing

  return (
    <Card gap="$3">
      <Heading level={6}>AI Credits</Heading>

      <XStack gap="$4" width="100%" alignItems="flex-start">
        <YStack gap="$2" flex={1} minWidth={0}>
          <Text fontSize="$1" secondary>
            Total Credits
          </Text>
          {aiCreditsBalance !== null ? (
            <Heading level={5}>{Number.parseFloat(aiCreditsBalance).toFixed(2)}</Heading>
          ) : (
            <Spinner size="sm" />
          )}
        </YStack>
        {withdrawableDisplay && (
          <YStack gap="$2" flex={1} minWidth={0}>
            <Text fontSize="$1" secondary>
              Withdrawable
            </Text>
            <Heading level={5}>${withdrawableDisplay}</Heading>
          </YStack>
        )}
      </XStack>

      <XStack gap="$2" width="100%">
          <StatCell label="Payer G$ Balance">
            {gBalance !== null ? (
              <StatValueText>{formatCompactG(gBalance)}</StatValueText>
            ) : (
              <Spinner size="sm" />
            )}
          </StatCell>
          <StatCell label="Total Deposited">
            <StatValueText>{formatCompactG(totalGdDepositedG ?? '0.00')}</StatValueText>
          </StatCell>
          <StatCell label="Monthly Stream">
            <StatValueText>{formatCompactG(monthlyStreamG ?? '0.00')}</StatValueText>
          </StatCell>
          <StatCell label="Est. Monthly Credits">
            {monthlyStreamCredits && Number.parseFloat(monthlyStreamCredits) > 0 ? (
              <StatValueText color="$primary">
                ~{Number.parseFloat(monthlyStreamCredits).toFixed(2)}/mo
              </StatValueText>
            ) : (
              <StatValueText>—</StatValueText>
            )}
          </StatCell>
      </XStack>

      <YStack gap="$1">
        <Text fontSize="$1" variant="label">
          Close Channel
        </Text>
        <XStack gap="$2" alignItems="center">
          <YStack flex={1}>
            <Input
              size="sm"
              value={channelId}
              onChangeText={actions.setChannelId}
              placeholder="0x… (64 hex chars)"
            />
          </YStack>
          <HoverTooltip message={!buyerKeyPrivate ? BUYER_KEY_REQUIRED_CLOSE_TOOLTIP : null}>
            <Button
              variant="outline"
              size="sm"
              minWidth="$14"
              flexShrink={0}
              disabled={!canClose}
              {...compactButtonProps}
              onPress={() => {
                setIsClosing(true)
                void Promise.resolve(actions.closeChannel()).finally(() => setIsClosing(false))
              }}
            >
              <ButtonText>{isClosing ? 'Closing…' : 'Close'}</ButtonText>
            </Button>
          </HoverTooltip>
        </XStack>
      </YStack>

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
              onChangeText={actions.setWithdrawAmount}
              placeholder={
                withdrawableDisplay ? `USD (max $${withdrawableDisplay})` : 'Amount in USD'
              }
            />
          </YStack>
          <HoverTooltip message={!buyerKeyPrivate ? BUYER_KEY_REQUIRED_WITHDRAW_TOOLTIP : null}>
            <Button
              variant="outline"
              size="sm"
              minWidth="$14"
              flexShrink={0}
              disabled={!canWithdraw}
              {...compactButtonProps}
              onPress={() => {
                setIsWithdrawing(true)
                void Promise.resolve(actions.withdrawCredits()).finally(() => setIsWithdrawing(false))
              }}
            >
              <ButtonText>{isWithdrawing ? 'Withdrawing…' : 'Withdraw'}</ButtonText>
            </Button>
          </HoverTooltip>
        </XStack>
      </YStack>
    </Card>
  )
}
