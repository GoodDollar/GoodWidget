import React from 'react'
import {
  Button,
  Drawer,
  Heading,
  Icon,
  ScrollArea,
  XStack,
  YStack,
} from '@goodwidget/ui'
import type { BridgeTransaction } from '@goodsdks/bridging-sdk'
import { getChainTransactionExplorerLink } from '../adapter/chains'
import { formatHistoryAmount } from '../amount'
import { BridgeProgress, getBridgeProgressTitle } from './BridgeProgress'

interface BridgeHistoryDetailModalProps {
  transaction: BridgeTransaction | null
  explorerLink: string | null
  onClose: () => void
}

// A History entry reuses the same end-to-end progress view as a just-submitted bridge.
export function BridgeHistoryDetailModal({ transaction, explorerLink, onClose }: BridgeHistoryDetailModalProps) {
  if (!transaction) return null

  const sourceTxHash = transaction.status.srcTxHash ??
    (transaction.status.dstTxHash === transaction.hash ? null : transaction.hash)
  const destinationTxHash = transaction.status.dstTxHash ?? null

  return (
    <Drawer open={transaction !== null} onClose={onClose} height="full" hideCloseButton>
      <ScrollArea width="100%" minHeight={0}>
        <YStack testID="BridgingWidget-history-detail" gap="$4" width="100%">
          <XStack justifyContent="space-between" alignItems="center">
            <Heading level={5} color="$textColor" testID="BridgingWidget-history-status">
              {getBridgeProgressTitle(transaction.status)}
            </Heading>
            <Button size="sm" variant="ghost" onPress={onClose} aria-label="Close bridge status">
              <Icon name="x" size="sm" color="muted" />
            </Button>
          </XStack>

          <BridgeProgress
            fromChainId={transaction.fromChainId}
            targetChainId={transaction.toChainId}
            protocol={transaction.protocol}
            amountLabel={formatHistoryAmount(transaction.amount)}
            sourceTxHash={sourceTxHash}
            sourceTimestamp={sourceTxHash ? transaction.timestamp : undefined}
            deliveryStatus={transaction.status}
            deliveryStatusError={null}
            sourceExplorerLink={getChainTransactionExplorerLink(transaction.fromChainId, sourceTxHash)}
            providerExplorerLink={sourceTxHash ? explorerLink : null}
            destinationExplorerLink={getChainTransactionExplorerLink(transaction.toChainId, destinationTxHash)}
          />
        </YStack>
      </ScrollArea>
    </Drawer>
  )
}
