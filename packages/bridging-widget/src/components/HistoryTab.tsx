import React from 'react'
import { formatUnits } from 'viem'
import { Badge, BadgeText, Heading, Spinner, Text, XStack, YStack, getChainDisplayName } from '@goodwidget/ui'
import type { BridgeTransaction } from '@goodsdks/bridging-sdk'
import { formatTokenAmount } from '../amount'
import { BridgingTabContent, EmptyStateCard, PROTOCOL_LABELS, RouteSelectionCard } from './shared'

const G_DOLLAR_DECIMALS = 18

interface HistoryTabProps {
  transactions: BridgeTransaction[]
  isLoading: boolean
  error: string | null
  onSelectTransaction: (transaction: BridgeTransaction) => void
}

const STATUS_BADGE_TYPE: Record<BridgeTransaction['status']['status'], 'success' | 'warning' | 'error'> = {
  completed: 'success',
  pending: 'warning',
  failed: 'error',
}

// One tappable row per bridge transfer. Every row is tappable (not just
// pending ones) so a user can re-check a failed transfer's detail too; the
// detail modal itself decides what to show for each status.
function HistoryRow({ transaction, onPress }: { transaction: BridgeTransaction; onPress: () => void }) {
  return (
    <RouteSelectionCard testID="BridgingWidget-history-row" cursor="pointer" onPress={onPress} padding="$3" gap="$2">
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontWeight="600">
          {getChainDisplayName(transaction.fromChainId)} → {getChainDisplayName(transaction.toChainId)}
        </Text>
        <Badge type={STATUS_BADGE_TYPE[transaction.status.status]}>
          <BadgeText>{transaction.status.status}</BadgeText>
        </Badge>
      </XStack>
      <XStack justifyContent="space-between" alignItems="center">
        <Text secondary fontSize={12}>
          {PROTOCOL_LABELS[transaction.protocol]} · {new Date(transaction.timestamp * 1000).toLocaleString()}
        </Text>
        <Text fontWeight="500">{formatTokenAmount(formatUnits(transaction.amount, G_DOLLAR_DECIMALS))} G$</Text>
      </XStack>
    </RouteSelectionCard>
  )
}

// Loads the connected address's bridge history (useBridgeHistory, driven via
// the adapter) across all supported chains. Tapping any row reopens
// BridgeHistoryDetailModal so a pending transfer's delivery can be tracked.
export function HistoryTab({ transactions, isLoading, error, onSelectTransaction }: HistoryTabProps) {
  if (isLoading) {
    return (
      <BridgingTabContent>
        <EmptyStateCard>
          <Spinner size="md" />
          <Text secondary>Loading history…</Text>
        </EmptyStateCard>
      </BridgingTabContent>
    )
  }

  if (error) {
    return (
      <BridgingTabContent>
        <EmptyStateCard>
          <Text color="$error">{error}</Text>
        </EmptyStateCard>
      </BridgingTabContent>
    )
  }

  if (transactions.length === 0) {
    return (
      <BridgingTabContent>
        <EmptyStateCard>
          <Heading level={4} textAlign="center">
            Bridge history
          </Heading>
          <Text secondary center>
            Transactions you bridge will show up here.
          </Text>
        </EmptyStateCard>
      </BridgingTabContent>
    )
  }

  return (
    <BridgingTabContent>
      <YStack gap="$2">
        {transactions.map((transaction) => (
          <HistoryRow
            key={transaction.hash}
            transaction={transaction}
            onPress={() => onSelectTransaction(transaction)}
          />
        ))}
      </YStack>
    </BridgingTabContent>
  )
}
