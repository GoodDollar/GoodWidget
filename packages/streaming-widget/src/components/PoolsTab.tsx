import React from 'react'
import {
  Button,
  ButtonText,
  Spinner,
  Text,
  YStack,
} from '@goodwidget/ui'
import type { Address } from 'viem'
import type { PoolMembershipItem, WriteStatus } from '../widgetRuntimeContract'
import { tokenSymbol } from './format'
import { PoolCard } from './PoolCard'
import { EmptyStateCard, ErrorStateCard, StreamingTabContent } from './shared'

interface PoolsTabProps {
  pools: PoolMembershipItem[]
  loading: boolean
  error: string | null
  chainId: number | null
  poolConnectStatus: Record<string, WriteStatus>
  poolConnectError: Record<string, string | null>
  poolClaimStatus: Record<string, WriteStatus>
  poolClaimError: Record<string, string | null>
  onRefresh: () => void
  onConnect: (poolAddress: Address) => void
  onDisconnect: (poolAddress: Address) => void
  onClaim: (poolAddress: Address) => void
}

export function PoolsTab({
  pools,
  loading,
  error,
  chainId,
  poolConnectStatus,
  poolConnectError,
  poolClaimStatus,
  poolClaimError,
  onRefresh,
  onConnect,
  onDisconnect,
  onClaim,
}: PoolsTabProps) {
  const activeToken = tokenSymbol(chainId)

  return (
    <StreamingTabContent>
      {loading && (
        <YStack alignItems="center" paddingVertical="$4">
          <Spinner size="lg" />
          <Text secondary>Loading pool memberships...</Text>
        </YStack>
      )}

      {!loading && error && (
        <ErrorStateCard>
          <Text color="$error">{error}</Text>
          <Button onPress={onRefresh}>
            <ButtonText>Retry</ButtonText>
          </Button>
        </ErrorStateCard>
      )}

      {!loading && !error && pools.length === 0 && (
        <EmptyStateCard>
          <Text secondary center>
            No GDA pool memberships found for this address.
          </Text>
          <Button onPress={onRefresh}>
            <ButtonText>Refresh</ButtonText>
          </Button>
        </EmptyStateCard>
      )}

      {!loading &&
        !error &&
        pools.map((pool) => (
          <PoolCard
            key={pool.poolId}
            pool={pool}
            token={activeToken}
            connectStatus={poolConnectStatus[pool.poolId] ?? 'idle'}
            connectError={poolConnectError[pool.poolId] ?? null}
            claimStatus={poolClaimStatus[pool.poolId] ?? 'idle'}
            claimError={poolClaimError[pool.poolId] ?? null}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            onClaim={onClaim}
            onRetryClaimable={onRefresh}
          />
        ))}
    </StreamingTabContent>
  )
}
