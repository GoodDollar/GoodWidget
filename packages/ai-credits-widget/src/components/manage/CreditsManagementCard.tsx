import React, { useState } from 'react'
import { Button, ButtonText, Card, Heading, Input, Separator, Spinner, Text, TokenAmount, XStack, YStack } from '@goodwidget/ui'
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
    <Card gap="$4">
      <Heading level={5}>AI Credits</Heading>

      <YStack gap="$2">
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">Total Credits</Text>
          {aiCreditsBalance !== null ? (
            <Heading level={4}>{Number.parseFloat(aiCreditsBalance).toFixed(2)}</Heading>
          ) : (
            <Spinner size="sm" />
          )}
        </XStack>

        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label" secondary>
            Payer G$ Balance
          </Text>
          {gBalance !== null ? (
            <TokenAmount token="G$" amount={gBalance} size="sm" />
          ) : (
            <Spinner size="sm" />
          )}
        </XStack>

        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label" secondary>
            Total Deposited
          </Text>
          <TokenAmount token="G$" amount={totalGdDepositedG ?? '0.00'} size="sm" />
        </XStack>

        <Separator />

        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">Monthly Stream</Text>
          <TokenAmount token="G$" amount={monthlyStreamG ?? '0.00'} size="sm" />
        </XStack>

        {monthlyStreamCredits && Number.parseFloat(monthlyStreamCredits) > 0 && (
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="label" secondary>
              Est. Monthly Credits
            </Text>
            <Text fontSize="$2" color="$primary">
              ~{Number.parseFloat(monthlyStreamCredits).toFixed(2)} credits/mo
            </Text>
          </XStack>
        )}

        {withdrawableDisplay && (
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="label" secondary>
              Withdrawable
            </Text>
            <Text fontSize="$2">${withdrawableDisplay}</Text>
          </XStack>
        )}
      </YStack>

      <YStack gap="$1">
        <Text variant="label">Close Channel</Text>
        <XStack gap="$2" alignItems="center">
          <YStack flex={1}>
            <Input
              value={channelId}
              onChangeText={actions.setChannelId}
              placeholder="0x… (64 hex chars)"
            />
          </YStack>
          <HoverTooltip
            message={!buyerKeyPrivate ? BUYER_KEY_REQUIRED_CLOSE_TOOLTIP : null}
          >
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
          <Text variant="label">Withdraw</Text>
          <InfoTooltip message={WITHDRAW_TOOLTIP} />
        </XStack>
        <XStack gap="$2" alignItems="center">
          <YStack flex={1}>
            <Input
              value={withdrawAmount}
              onChangeText={actions.setWithdrawAmount}
              placeholder={
                withdrawableDisplay ? `USD (max $${withdrawableDisplay})` : 'Amount in USD'
              }
            />
          </YStack>
          <HoverTooltip
            message={!buyerKeyPrivate ? BUYER_KEY_REQUIRED_WITHDRAW_TOOLTIP : null}
          >
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

