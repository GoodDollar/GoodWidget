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
import type { AirdropStatus } from '../hooks/useAirdropStatus'
import type { CampaignLeaderboardAdapter, CampaignPointsAccount } from '../hooks/useCampaignLeaderboard'
import { useCampaignLeaderboard } from '../hooks/useCampaignLeaderboard'
import type { CampaignPoolMockData, LeaderboardEntryMockData } from '../widgetRuntimeContract'
import { LeaderboardRow } from './LeaderboardRow'
import { compactButtonProps, truncateAddress } from './shared/styles'

interface LeaderboardViewProps {
  /** #127's two fixed reward pools, one leaderboard tab each. */
  pools: CampaignPoolMockData[]
  address: string | null
  leaderboardAdapter?: CampaignLeaderboardAdapter
  isConnected: boolean
  onConnect: () => void
  onClose: () => void
  airdropStatus: { status: AirdropStatus | null; isLoading: boolean; error: string | null }
}

/**
 * Converts one campaign's ranked accounts page into the row shape LeaderboardRow
 * expects. Rank is derived from position within the page — the Points API
 * returns accounts pre-sorted by totalPoints desc but has no rank field of
 * its own. completedActivities is intentionally omitted: the live API has no
 * per-activity breakdown, so LeaderboardRow hides that column for these rows
 * rather than rendering misleading all-dimmed icons.
 */
function toLeaderboardEntries(accounts: CampaignPointsAccount[]): LeaderboardEntryMockData[] {
  return accounts.map((account, index) => ({
    rank: index + 1,
    address: account.account,
    points: account.totalPoints,
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
 * Search is a local filter over the active tab's fetched page only — there is
 * no server-side search endpoint. Pagination beyond the first 50-account page
 * is out of scope, matching the pre-existing pagination placeholder.
 */
export function LeaderboardView({
  pools,
  address,
  leaderboardAdapter,
  isConnected,
  onConnect,
  onClose,
  airdropStatus,
}: LeaderboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCampaignTab, setActiveCampaignTab] = useState<string>(pools[0]?.id ?? '')

  const firstPoolResult = useCampaignLeaderboard(pools[0]?.campaignId ?? 0, leaderboardAdapter)
  const secondPoolResult = useCampaignLeaderboard(pools[1]?.campaignId ?? 0, leaderboardAdapter)
  const resultByPoolId: Record<string, typeof firstPoolResult> = {}
  if (pools[0]) resultByPoolId[pools[0].id] = firstPoolResult
  if (pools[1]) resultByPoolId[pools[1].id] = secondPoolResult

  const activePool = pools.find((pool) => pool.id === activeCampaignTab) ?? pools[0]
  const activeResult = activePool ? resultByPoolId[activePool.id] : undefined
  const rankedEntries = toLeaderboardEntries(activeResult?.data?.accounts ?? [])

  const currentUserEntry =
    isConnected && address
      ? (rankedEntries.find((entry) => entry.address.toLowerCase() === address.toLowerCase()) ?? null)
      : null

  const matchesQuery = (entry: LeaderboardEntryMockData) => {
    if (!searchQuery.trim()) return true
    return entry.address.toLowerCase().includes(searchQuery.trim().toLowerCase())
  }

  const visibleRows = rankedEntries.filter(matchesQuery)

  return (
    <YStack gap="$4" width="100%">
      <XStack justifyContent="space-between" alignItems="center" width="100%">
        <Heading level={5}>Superfluid</Heading>
        <XStack gap="$2" alignItems="center">
          {isConnected ? (
            <XStack gap="$2" alignItems="center" paddingHorizontal="$3" paddingVertical="$2" borderRadius="$full" borderWidth={1} borderColor="$borderColor">
              <YStack width={8} height={8} borderRadius="$full" backgroundColor="$success" />
              <Text variant="label">{address ? truncateAddress(address) : ''}</Text>
              <Icon name="chevron-down" size="xs" color="muted" />
            </XStack>
          ) : (
            <Button size="sm" {...compactButtonProps} onPress={onConnect}>
              <ButtonText>Connect wallet</ButtonText>
            </Button>
          )}
          <Button
            size="sm"
            {...compactButtonProps}
            variant="ghost"
            iconSize="sm"
            onPress={onClose}
            aria-label="Close leaderboard"
          >
            <Icon name="x" size="sm" />
          </Button>
        </XStack>
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
          <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="$2" $sm={{ flexDirection: 'column', alignItems: 'stretch' }}>
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

      {/*
        Live airdrop-eligibility check against the connected wallet. Deliberately
        kept separate from the "Your position" points card above: the airdrop
        endpoint reports claim/invite eligibility, not the campaign points total
        (which comes from the live Points API leaderboard fetch above — see
        useCampaignLeaderboard). Don't merge the two into one "points" figure.
      */}
      {isConnected && (
        <Card gap="$2">
          <Text variant="label">Airdrop status</Text>
          {airdropStatus.isLoading && <Text tone="soft">Checking your Superfluid airdrop status...</Text>}
          {airdropStatus.error && <Text color="$error">{airdropStatus.error}</Text>}
          {!airdropStatus.isLoading && !airdropStatus.error && airdropStatus.status && (
            <Text tone="soft">
              {airdropStatus.status.error === 'not whitelisted'
                ? 'Not yet whitelisted for the SUP airdrop.'
                : (airdropStatus.status.error ?? 'Eligible for the SUP airdrop.')}
            </Text>
          )}
          {airdropStatus.status?.walletData && (
            <XStack gap="$3">
              <Text variant="caption" tone="secondary">
                Claims: {airdropStatus.status.walletData.claims}
              </Text>
              <Text variant="caption" tone="secondary">
                Invites: {airdropStatus.status.walletData.invites}
              </Text>
            </XStack>
          )}
        </Card>
      )}

      <Input placeholder="Search by wallet address" value={searchQuery} onChangeText={setSearchQuery} />

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
        <YStack gap="$2" width="100%">
          {visibleRows.map((entry) => (
            <LeaderboardRow key={entry.address} entry={entry} isCurrentUser={entry.address === currentUserEntry?.address} />
          ))}
        </YStack>
      )}

      <YStack gap="$2" alignItems="center">
        <Text variant="caption" tone="secondary">
          Points update every few minutes.
        </Text>
        {/* Placeholder pagination — the Points API's accounts endpoint is fetched
            as a single 50-row page; real pagination wiring against further pages
            is out of scope here. */}
        <XStack gap="$1">
          <Button size="sm" {...compactButtonProps} variant="secondary" disabled>
            <ButtonText>1</ButtonText>
          </Button>
          <Button size="sm" {...compactButtonProps} variant="ghost" disabled>
            <ButtonText>2</ButtonText>
          </Button>
          <Button size="sm" {...compactButtonProps} variant="ghost" disabled>
            <ButtonText>3</ButtonText>
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}
