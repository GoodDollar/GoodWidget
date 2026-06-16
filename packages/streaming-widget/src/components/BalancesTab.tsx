import React from 'react'
import {
  AddressDisplay,
  Anchor,
  Badge,
  BadgeText,
  ButtonText,
  Icon,
  Spinner,
  Text,
  TokenAmount,
  XStack,
  YStack,
} from '@goodwidget/ui'
import type { SupReserveLockerItem } from '../widgetRuntimeContract'
import {
  SUPERFLUID_APP_URL,
  chainName,
  formatWeiAmount,
  superfluidReserveUrl,
  tokenSymbol,
} from './format'
import { ActionButton, BalanceCard, StreamingTabContent } from './shared'

interface ExternalLinkProps {
  href: string
  children: React.ReactNode
}

function ExternalLink({ href, children }: ExternalLinkProps) {
  return (
    <XStack gap="$1" alignItems="center" flexWrap="wrap">
      <Anchor href={href}>{children}</Anchor>
      <Icon name="external-link" size="xs" color="primary" />
    </XStack>
  )
}

interface BalancesTabProps {
  chainId: number | null
  superTokenBalance: string | null
  balanceLoading: boolean
  balanceError: string | null
  supTokenBalance: string | null
  supBalanceLoading: boolean
  supBalanceError: string | null
  supReserveBalance: string | null
  supReserveLockers: SupReserveLockerItem[]
  supReserveLoading: boolean
  supReserveError: string | null
  onRefresh: () => void
}

export function BalancesTab({
  chainId,
  superTokenBalance,
  balanceLoading,
  balanceError,
  supTokenBalance,
  supBalanceLoading,
  supBalanceError,
  supReserveBalance,
  supReserveLockers,
  supReserveLoading,
  supReserveError,
  onRefresh,
}: BalancesTabProps) {
  const activeToken = tokenSymbol(chainId)

  return (
    <StreamingTabContent>
      <BalanceCard>
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">Super Token Balance</Text>
          <ActionButton onPress={onRefresh}>
            <ButtonText>Refresh</ButtonText>
          </ActionButton>
        </XStack>

        {balanceLoading && <Spinner size="sm" />}

        {!balanceLoading && balanceError && (
          <Text color="$error" variant="caption">
            {balanceError}
          </Text>
        )}

        {!balanceLoading && !balanceError && superTokenBalance !== null && (
          <TokenAmount token={activeToken} amount={superTokenBalance} size="xl" />
        )}

        {chainId && (
          <Badge type="info">
            <BadgeText>{chainName(chainId)}</BadgeText>
          </Badge>
        )}
      </BalanceCard>

      <BalanceCard>
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">SUP Balance</Text>
          {supBalanceLoading && <Spinner size="sm" />}
        </XStack>

        {!supBalanceLoading && supBalanceError && (
          <Text color="$error" variant="caption">
            {supBalanceError}
          </Text>
        )}

        {!supBalanceLoading && !supBalanceError && (
          <TokenAmount token="SUP" amount={supTokenBalance ?? '0'} size="lg" />
        )}

        <Text variant="caption" secondary>
          Read-only Base balance.
        </Text>
        <ExternalLink href={SUPERFLUID_APP_URL}>
          To see your active SUP streams visit app.superfluid.org
        </ExternalLink>
      </BalanceCard>

      <BalanceCard>
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label">SUP Reserve</Text>
          {supReserveLoading && <Spinner size="sm" />}
        </XStack>

        {!supReserveLoading && supReserveError && (
          <Text color="$error" variant="caption">
            {supReserveError}
          </Text>
        )}

        {!supReserveLoading && !supReserveError && (
          <TokenAmount token="SUP" amount={supReserveBalance ?? '0'} size="lg" />
        )}

        <Text variant="caption" secondary>
          Read-only Base reserve lockers.
        </Text>

        {!supReserveLoading &&
          !supReserveError &&
          supReserveLockers.length === 0 && (
            <Text variant="caption" secondary>
              No SUP reserve lockers found.
            </Text>
          )}

        {!supReserveLoading &&
          !supReserveError &&
          supReserveLockers.map((locker) => (
            <YStack key={locker.address} gap="$2">
              <XStack justifyContent="space-between" alignItems="center">
                <Text variant="caption" secondary>
                  Reserve locker
                </Text>
                <AddressDisplay address={locker.address} size="sm" />
              </XStack>
              <XStack justifyContent="space-between" alignItems="center">
                <Text variant="caption" secondary>
                  Available
                </Text>
                <TokenAmount
                  token="SUP"
                  amount={formatWeiAmount(locker.unstakedBalance)}
                  size="sm"
                />
              </XStack>
              <XStack justifyContent="space-between" alignItems="center">
                <Text variant="caption" secondary>
                  Staked
                </Text>
                <TokenAmount
                  token="SUP"
                  amount={formatWeiAmount(locker.stakedBalance)}
                  size="sm"
                />
              </XStack>
              <ExternalLink href={superfluidReserveUrl(locker.address)}>
                Open reserve in Superfluid
              </ExternalLink>
            </YStack>
          ))}
      </BalanceCard>
    </StreamingTabContent>
  )
}
