import React, { useState } from 'react'
import {
  Button,
  ButtonText,
  Card,
  Heading,
  Input,
  Spinner,
  Text,
  TokenAmount,
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

interface CreditsManagementCardProps {
  state: AiCreditsWidgetAdapterState
  actions: Pick<
    AiCreditsWidgetAdapterActions,
    'setChannelId' | 'setWithdrawAmount' | 'closeChannel' | 'withdrawCredits'
  >
}

function StatCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <YStack flex={1} gap="$0.5" minWidth={0}>
      <Text fontSize="$1" secondary numberOfLines={2}>
        {label}
      </Text>
      {children}
    </YStack>
  )
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

      <YStack gap="$2">
        <Text fontSize="$1" secondary>
          Total Credits
        </Text>
        {aiCreditsBalance !== null ? (
          <Heading level={5}>{Number.parseFloat(aiCreditsBalance).toFixed(2)}</Heading>
        ) : (
          <Spinner size="sm" />
        )}
      </YStack>

      <YStack gap="$2">
        <XStack gap="$2">
          <StatCell label="Payer G$ Balance">
            {gBalance !== null ? (
              <TokenAmount token="G$" amount={gBalance} size="sm" />
            ) : (
              <Spinner size="sm" />
            )}
          </StatCell>
          <StatCell label="Total Deposited">
            <TokenAmount token="G$" amount={totalGdDepositedG ?? '0.00'} size="sm" />
          </StatCell>
        </XStack>
        <XStack gap="$2">
          <StatCell label="Monthly Stream">
            <TokenAmount token="G$" amount={monthlyStreamG ?? '0.00'} size="sm" />
          </StatCell>
          <StatCell label="Est. Monthly Credits">
            {monthlyStreamCredits && Number.parseFloat(monthlyStreamCredits) > 0 ? (
              <Text fontSize="$2" color="$primary" numberOfLines={1}>
                ~{Number.parseFloat(monthlyStreamCredits).toFixed(2)}/mo
              </Text>
            ) : (
              <Text fontSize="$2" secondary>
                —
              </Text>
            )}
          </StatCell>
        </XStack>
        {withdrawableDisplay && (
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$1" secondary>
              Withdrawable
            </Text>
            <Text fontSize="$2">${withdrawableDisplay}</Text>
          </XStack>
        )}
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
              onChangeText={actions.setChannelId}
              placeholder="0x… (64 hex chars)"
            />
          </YStack>
          <HoverTooltip message={!buyerKeyPrivate ? BUYER_KEY_REQUIRED_CLOSE_TOOLTIP : null}>
            <Button
              variant="outline"
              size="sm"
              flexShrink={0}
              disabled={!canClose}
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
              flexShrink={0}
              disabled={!canWithdraw}
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
