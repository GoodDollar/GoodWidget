import React, { useState } from 'react'
import {
  Badge,
  BadgeText,
  Button,
  ButtonText,
  Card,
  Heading,
  Icon,
  Input,
  Text,
  WidgetTabs,
  XStack,
  YStack,
} from '@goodwidget/ui'
import type {
  CampaignLeaderboardAdapter,
  CampaignPointsAccount,
  CampaignPointsPagination,
} from '../hooks/useCampaignLeaderboard'
import { useCampaignLeaderboard } from '../hooks/useCampaignLeaderboard'
import type { CampaignPoolDefinition, LeaderboardEntry } from '../widgetRuntimeContract'
import { LEADERBOARD_COLUMN_WIDTHS, LeaderboardRow } from './LeaderboardRow'
import { compactButtonProps, truncateAddress } from './shared/styles'
import { WalletChip } from './shared/WalletChip'

interface LeaderboardViewProps {
  /** Matches the "SEASON N" badge shown next to the wordmark on the content view's header. */
  seasonLabel: string
  /** #127's two fixed reward pools, one leaderboard tab each. */
  pools: CampaignPoolDefinition[]
  address: string | null
  leaderboardAdapter?: CampaignLeaderboardAdapter
  isConnected: boolean
  onConnect: () => void
  onDisconnect?: () => Promise<void>
  onClose: () => void
}

/**
 * Converts one campaign's ranked accounts page into the row shape LeaderboardRow
 * expects. Rank is derived from the page offset because the Points API returns
 * accounts pre-sorted by totalPoints but has no rank field of its own.
 */
function toLeaderboardEntries(
  accounts: CampaignPointsAccount[],
  pagination: CampaignPointsPagination | undefined,
): LeaderboardEntry[] {
  const rankOffset = pagination ? (pagination.page - 1) * pagination.limit : 0
  return accounts.map((account, index) => ({
    rank: rankOffset + index + 1,
    address: account.account,
    points: account.totalPoints,
    completedActivities: account.completedActivities,
  }))
}

/**
 * Full leaderboard view — one tab per campaign pool (GoodDollar actions /
 * Ecosystem actions), each backed by its own live Superfluid Points
 * API fetch via useCampaignLeaderboard. The hook is called a fixed number of
 * times, once per pool in prop order, rather than in a loop over `pools`,
 * since React requires the same hooks in the same order on every render and
 * #127's two pools are a fixed structural constant.
 *
 * Search is a local filter over the active tab's fetched page only because the
 * API has no server-side search endpoint. Pages are intentionally small: each
 * account is enriched with its own event history to derive activity icons.
 */
export function LeaderboardView({
  seasonLabel,
  pools,
  address,
  leaderboardAdapter,
  isConnected,
  onConnect,
  onDisconnect,
  onClose,
}: LeaderboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCampaignTab, setActiveCampaignTab] = useState<string>(pools[0]?.id ?? '')
  const [pageByPoolId, setPageByPoolId] = useState<Record<string, number>>({})

  const firstPool = pools[0]
  const secondPool = pools[1]
  const firstPoolResult = useCampaignLeaderboard(
    firstPool?.campaignId ?? 0,
    firstPool?.actions ?? [],
    firstPool ? (pageByPoolId[firstPool.id] ?? 1) : 1,
    Boolean(firstPool && activeCampaignTab === firstPool.id),
    leaderboardAdapter,
  )
  const secondPoolResult = useCampaignLeaderboard(
    secondPool?.campaignId ?? 0,
    secondPool?.actions ?? [],
    secondPool ? (pageByPoolId[secondPool.id] ?? 1) : 1,
    Boolean(secondPool && activeCampaignTab === secondPool.id),
    leaderboardAdapter,
  )
  const resultByPoolId: Record<string, typeof firstPoolResult> = {}
  if (pools[0]) resultByPoolId[pools[0].id] = firstPoolResult
  if (pools[1]) resultByPoolId[pools[1].id] = secondPoolResult

  const activePool = pools.find((pool) => pool.id === activeCampaignTab) ?? pools[0]
  const activeResult = activePool ? resultByPoolId[activePool.id] : undefined
  const activePagination = activeResult?.data?.pagination
  const rankedEntries = toLeaderboardEntries(activeResult?.data?.accounts ?? [], activePagination)

  const currentUserEntry =
    isConnected && address
      ? (rankedEntries.find((entry) => entry.address.toLowerCase() === address.toLowerCase()) ??
        null)
      : null

  const matchesQuery = (entry: LeaderboardEntry) => {
    if (!searchQuery.trim()) return true
    return entry.address.toLowerCase().includes(searchQuery.trim().toLowerCase())
  }

  const visibleRows = rankedEntries.filter(matchesQuery)
  const setActivePage = (page: number) => {
    if (!activePool) return
    setPageByPoolId((current) => ({ ...current, [activePool.id]: page }))
  }

  return (
    <YStack gap="$5" width="100%" padding="$5" style={{ boxSizing: 'border-box' }}>
      {/* The close button is kept as its own flex item in a row that never wraps
          (alignItems="flex-start" pins it to the top), so it always stays top-right —
          only the inner wordmark/badge + wallet CTA group wraps to its own line
          below when it doesn't fit. Without this split, the close button used to
          wrap down together with the CTA since both lived inside one flex item. */}
      <XStack justifyContent="space-between" alignItems="flex-start" width="100%" gap="$2">
        <XStack
          flexWrap="wrap"
          justifyContent="space-between"
          alignItems="center"
          gap="$2"
          flex={1}
        >
          <XStack gap="$2" alignItems="center">
            <Heading level={5}>Superfluid</Heading>
            <Badge type="info">
              <BadgeText>{seasonLabel}</BadgeText>
            </Badge>
          </XStack>
          {isConnected ? (
            <WalletChip address={address} onDisconnect={onDisconnect} />
          ) : (
            <Button size="sm" {...compactButtonProps} onPress={onConnect}>
              <ButtonText>Connect wallet</ButtonText>
            </Button>
          )}
        </XStack>
        <Button
          size="sm"
          {...compactButtonProps}
          variant="ghost"
          iconSize="sm"
          flexShrink={0}
          onPress={onClose}
          aria-label="Close leaderboard"
        >
          <Icon name="x" size="sm" />
        </Button>
      </XStack>

      <YStack gap="$1">
        <Heading level={2}>Leaderboard</Heading>
        <Text tone="soft">See how you rank against other campaign participants.</Text>
      </YStack>

      <WidgetTabs
        withConnectionStatus={false}
        tabs={pools.map((pool) => ({ id: pool.id, label: pool.label }))}
        activeTab={activePool?.id ?? ''}
        onTabChange={setActiveCampaignTab}
      />

      {isConnected && currentUserEntry && (
        <Card gap="$3">
          <XStack
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap="$2"
            $sm={{ flexDirection: 'column', alignItems: 'stretch' }}
          >
            <XStack gap="$2" alignItems="center">
              <Text variant="label">Your position</Text>
              <Text fontWeight="700">#{currentUserEntry.rank}</Text>
              <Text>{truncateAddress(currentUserEntry.address)}</Text>
              <Badge type="info">
                <BadgeText>You</BadgeText>
              </Badge>
            </XStack>
            <Text variant="label">Your points: {currentUserEntry.points.toLocaleString()}</Text>
          </XStack>
        </Card>
      )}

      <Input
        placeholder="Search by wallet address"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* supDistributed/supTotal have no live source (Points API gap, reported
          separately) — totalParticipants below is the live per-tab count. */}
      {activeResult?.data && (
        <Text variant="caption" tone="secondary">
          Total participants: {activeResult.data.summary.memberCount.toLocaleString()}
        </Text>
      )}

      {activeResult?.isLoading && <Text tone="soft">Loading leaderboard...</Text>}
      {activeResult?.error && <Text color="$error">{activeResult.error}</Text>}

      {!activeResult?.isLoading && !activeResult?.error && (
        <YStack data-testid="Leaderboard-table-scroll" width="100%" style={{ overflowX: 'auto' }}>
          {/* The minimum table width is only active below $sm (480px). Header
              and rows share this one scroll container, so their columns stay
              aligned while the complete table remains available horizontally. */}
          <YStack gap="$2" width="100%" minWidth={0} $sm={{ minWidth: 480 }}>
            <XStack alignItems="center" gap="$3" padding="$3">
              <Text variant="label" width={LEADERBOARD_COLUMN_WIDTHS.rank}>
                Rank
              </Text>
              <Text variant="label" width={LEADERBOARD_COLUMN_WIDTHS.address}>
                Address
              </Text>
              <Text variant="label" width={LEADERBOARD_COLUMN_WIDTHS.points}>
                Points
              </Text>
              <Text variant="label" width={LEADERBOARD_COLUMN_WIDTHS.actions}>
                Actions
              </Text>
            </XStack>
            {visibleRows.map((entry) => (
              <LeaderboardRow
                key={entry.address}
                entry={entry}
                isCurrentUser={entry.address === currentUserEntry?.address}
                activities={activePool?.actions.map((action) => action.activity) ?? []}
              />
            ))}
          </YStack>
        </YStack>
      )}

      <YStack gap="$2" alignItems="center">
        <Text variant="caption" tone="secondary">
          Points update every few minutes.
        </Text>
        {/* Keep pagination deliberately compact. Ten rows bounds the associated
            per-account event requests while Previous/Next still expose the
            complete leaderboard. */}
        <XStack gap="$1">
          <Button
            size="sm"
            {...compactButtonProps}
            variant="ghost"
            disabled={!activePagination?.hasPrevPage}
            onPress={() => setActivePage((activePagination?.page ?? 1) - 1)}
          >
            <ButtonText>Previous</ButtonText>
          </Button>
          <Button size="sm" {...compactButtonProps} variant="secondary" disabled>
            <ButtonText>
              {activePagination
                ? `${activePagination.page} / ${activePagination.totalPages}`
                : '1 / 1'}
            </ButtonText>
          </Button>
          <Button
            size="sm"
            {...compactButtonProps}
            variant="ghost"
            disabled={!activePagination?.hasNextPage}
            onPress={() => setActivePage((activePagination?.page ?? 1) + 1)}
          >
            <ButtonText>Next</ButtonText>
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}
