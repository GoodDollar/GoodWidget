import React from 'react'
import { formatUnits } from 'viem'
import {
  Badge,
  BadgeText,
  Button,
  ButtonText,
  Heading,
  Icon,
  Spinner,
  Text,
  XStack,
  YStack,
  getChainDisplayName,
} from '@goodwidget/ui'
import type { BridgeTransaction } from '@goodsdks/bridging-sdk'
import { getChainDecimals } from '../adapter/chains'
import { formatTokenAmount } from '../amount'
import { BridgingTabContent, EmptyStateCard, PROTOCOL_LABELS, RouteSelectionCard } from './shared'

interface HistoryTabProps {
  transactions: BridgeTransaction[]
  isLoading: boolean
  error: string | null
  /** True when a delivery-status lookup failed and the entry remains pending. */
  isPartial: boolean
  onRefresh: () => void
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
        <Text fontWeight="500">{formatTokenAmount(formatUnits(transaction.amount, getChainDecimals(transaction.fromChainId)))} G$</Text>
      </XStack>
    </RouteSelectionCard>
  )
}

// Loads the connected address's bridge history (useBridgeHistory, driven via
// the adapter) across all supported chains. Tapping any row reopens
// BridgeHistoryDetailModal so a pending transfer's delivery can be tracked.
//
// The underlying SDK call (getCombinedHistory) can silently drop a chain
// it failed to query internally — a known upstream limitation tracked
// separately in GoodSDKs, not something this widget can detect or fix. The
// copy below is deliberately non-committal ("no transactions found" rather
// than "you have no history") so it never asserts a blank history that may
// actually just be an SDK-side gap, and always offers a manual refresh.
export function HistoryTab({ transactions, isLoading, error, isPartial, onRefresh, onSelectTransaction }: HistoryTabProps) {
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

  if (error && transactions.length === 0) {
    return (
      <BridgingTabContent>
        <EmptyStateCard>
          <Text color="$error">{error}</Text>
          <Button size="sm" variant="secondary" onPress={onRefresh}>
            <ButtonText>Retry</ButtonText>
          </Button>
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
            No transactions found. Recently bridged funds can take a few minutes to appear — try refreshing.
          </Text>
          <Button size="sm" variant="secondary" onPress={onRefresh}>
            <ButtonText>Refresh</ButtonText>
          </Button>
        </EmptyStateCard>
      </BridgingTabContent>
    )
  }

  return (
    <BridgingTabContent>
      <XStack justifyContent="space-between" alignItems="center">
        <Heading level={4}>Bridge history</Heading>
        <Button size="sm" variant="ghost" iconSize="sm" onPress={onRefresh} aria-label="Refresh history">
          <Icon name="refresh" size="sm" color="muted" />
        </Button>
      </XStack>
      {error && (
        <Text color="$warning" fontSize={12}>
          History could not be refreshed. Showing the last loaded entries; tap refresh to try again.
        </Text>
      )}
      {!error && isPartial && (
        <Text color="$warning" fontSize={12}>
          Some delivery statuses could not be checked. Pending entries remain visible; tap refresh to try again.
        </Text>
      )}
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
