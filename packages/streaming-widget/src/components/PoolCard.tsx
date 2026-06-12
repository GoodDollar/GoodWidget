import React from 'react'
import {
  AddressDisplay,
  Badge,
  BadgeText,
  Button,
  ButtonText,
  Spinner,
  Text,
  TokenAmount,
  XStack,
} from '@goodwidget/ui'
import type { Address } from 'viem'
import type { PoolMembershipItem, WriteStatus } from '../widgetRuntimeContract'
import { formatWeiAmount } from './format'
import { PoolRow, WriteStatusBadge, type SuperTokenSymbol } from './shared'

interface PoolCardProps {
  pool: PoolMembershipItem
  token: SuperTokenSymbol
  connectStatus: WriteStatus
  connectError: string | null
  claimStatus: WriteStatus
  claimError: string | null
  onConnect: (poolAddress: Address) => void
  onDisconnect: (poolAddress: Address) => void
  onClaim: (poolAddress: Address) => void
  onRetryClaimable: () => void
}

export function PoolCard({
  pool,
  token,
  connectStatus,
  connectError,
  claimStatus,
  claimError,
  onConnect,
  onDisconnect,
  onClaim,
  onRetryClaimable,
}: PoolCardProps) {
  const isConnectPending = connectStatus === 'pending'
  const isClaimPending = claimStatus === 'pending'
  const canClaim = !pool.isConnected && pool.claimableAmount > 0n && !pool.claimableAmountError

  return (
    <PoolRow>
      <XStack justifyContent="space-between" alignItems="center">
        <AddressDisplay address={pool.poolId} />
        <Badge type={pool.isConnected ? 'success' : 'default'}>
          <BadgeText>{pool.isConnected ? 'Connected' : 'Disconnected'}</BadgeText>
        </Badge>
      </XStack>

      <XStack justifyContent="space-between" alignItems="center">
        <Text variant="caption" secondary>
          Claimable
        </Text>
        <TokenAmount token={token} amount={formatWeiAmount(pool.claimableAmount)} size="sm" />
      </XStack>

      <XStack justifyContent="space-between" alignItems="center">
        <Text variant="caption" secondary>
          Total claimed
        </Text>
        <TokenAmount token={token} amount={formatWeiAmount(pool.totalAmountClaimed)} size="sm" />
      </XStack>

      {connectError && (
        <Text color="$error" variant="caption">
          {connectError}
        </Text>
      )}
      {claimError && (
        <Text color="$error" variant="caption">
          {claimError}
        </Text>
      )}
      {pool.claimableAmountError && (
        <XStack gap="$1" alignItems="center" flexWrap="wrap">
          <Text color="$error" variant="caption">
            Could not load claimable amount.
          </Text>
          <Button variant="secondary" size="sm" onPress={onRetryClaimable}>
            <ButtonText>Retry</ButtonText>
          </Button>
        </XStack>
      )}

      <XStack gap="$2" alignItems="center" flexWrap="wrap">
        {pool.isConnected ? (
          <>
            <WriteStatusBadge status={claimStatus} />
            <Button
              variant="secondary"
              disabled={isConnectPending}
              borderColor="$error"
              onPress={() => onDisconnect(pool.poolId)}
            >
              {isConnectPending ? (
                <Spinner size="sm" />
              ) : (
                <ButtonText color="$error">Disconnect</ButtonText>
              )}
            </Button>
          </>
        ) : (
          <>
            <WriteStatusBadge status={claimStatus} />
            <Button
              disabled={!canClaim || isClaimPending || claimStatus === 'success'}
              onPress={() => onClaim(pool.poolId)}
            >
              {isClaimPending ? <Spinner size="sm" /> : <ButtonText>Claim</ButtonText>}
            </Button>
            <WriteStatusBadge status={connectStatus} />
            <Button
              variant="secondary"
              disabled={isConnectPending}
              onPress={() => onConnect(pool.poolId)}
            >
              {isConnectPending ? <Spinner size="sm" /> : <ButtonText>Connect</ButtonText>}
            </Button>
          </>
        )}
      </XStack>
    </PoolRow>
  )
}
