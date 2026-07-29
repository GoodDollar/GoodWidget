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
  XStack,
  YStack,
} from '@goodwidget/ui'
import type { LeaderboardEntryMockData, LeaderboardMockData } from '../widgetRuntimeContract'
import { ActivityIcons } from './ActivityIcons'
import { LeaderboardRow } from './LeaderboardRow'

interface LeaderboardViewProps {
  leaderboard: LeaderboardMockData
  isConnected: boolean
  onConnect: () => void
  onClose: () => void
}

/**
 * Builds the ranked row list shown between the "..." gaps: topEntries, then
 * the current user's row inserted at its correct rank position (not appended),
 * then bottomEntries. Rank order must be preserved because the mockup shows
 * the connected user's row wherever their actual rank places them — this is
 * non-trivial (position depends on comparing against the existing top band)
 * so it's worth a named helper rather than inlining the splice logic.
 */
function buildRankedRowsWithCurrentUser(
  topEntries: LeaderboardEntryMockData[],
  currentUserEntry: LeaderboardEntryMockData | null,
): LeaderboardEntryMockData[] {
  if (!currentUserEntry) return topEntries

  const insertIndex = topEntries.findIndex((entry) => entry.rank > currentUserEntry.rank)
  const rows = [...topEntries]
  if (insertIndex === -1) {
    rows.push(currentUserEntry)
  } else {
    rows.splice(insertIndex, 0, currentUserEntry)
  }
  return rows
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Full leaderboard view — disconnected and connected states.
 *
 * Search is local filter-only state; there is no real data source to query
 * against in this mock-data phase. Pagination controls are non-functional
 * placeholders since the mock dataset only has one page of rows — real
 * pagination wiring against a live leaderboard API is out of scope here.
 */
export function LeaderboardView({ leaderboard, isConnected, onConnect, onClose }: LeaderboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const rankedTopRows = buildRankedRowsWithCurrentUser(leaderboard.topEntries, leaderboard.currentUserEntry)

  const matchesQuery = (entry: LeaderboardEntryMockData) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.trim().toLowerCase()
    return entry.address.toLowerCase().includes(query) || (entry.ensName?.toLowerCase().includes(query) ?? false)
  }

  const visibleTopRows = rankedTopRows.filter(matchesQuery)
  const visibleBottomRows = leaderboard.bottomEntries.filter(matchesQuery)

  return (
    <YStack gap="$4" width="100%">
      <XStack justifyContent="space-between" alignItems="center" width="100%">
        <Heading level={5}>Superfluid</Heading>
        <XStack gap="$2" alignItems="center">
          {isConnected ? (
            <XStack gap="$2" alignItems="center" paddingHorizontal="$3" paddingVertical="$2" borderRadius="$full" borderWidth={1} borderColor="$borderColor">
              <YStack width={8} height={8} borderRadius="$full" backgroundColor="$success" />
              <Text variant="label">
                {leaderboard.currentUserEntry ? formatAddress(leaderboard.currentUserEntry.address) : ''}
              </Text>
              <Icon name="chevron-down" size="xs" color="muted" />
            </XStack>
          ) : (
            <Button size="sm" onPress={onConnect}>
              <ButtonText>Connect wallet</ButtonText>
            </Button>
          )}
          <Button size="sm" variant="ghost" iconSize="sm" onPress={onClose} aria-label="Close leaderboard">
            <Icon name="x" size="sm" />
          </Button>
        </XStack>
      </XStack>

      <YStack gap="$1">
        <Heading level={2}>Leaderboard</Heading>
        <Text secondary>See how you rank against other campaign participants.</Text>
      </YStack>

      {isConnected && leaderboard.currentUserEntry && (
        <Card gap="$3">
          <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="$2" $sm={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <XStack gap="$2" alignItems="center">
              <Text variant="label">Your position</Text>
              <Text fontWeight="700">#{leaderboard.currentUserEntry.rank}</Text>
              <Text>{leaderboard.currentUserEntry.ensName ?? formatAddress(leaderboard.currentUserEntry.address)}</Text>
              <Badge type="info">
                <BadgeText>You</BadgeText>
              </Badge>
            </XStack>
            <Text variant="label">Your points: {leaderboard.currentUserEntry.points.toLocaleString()}</Text>
          </XStack>
          <ActivityIcons completedActivities={leaderboard.currentUserEntry.completedActivities} />
        </Card>
      )}

      <Input
        placeholder="Search by wallet address or ENS"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Text variant="caption" secondary>
        Total participants: {leaderboard.totalParticipants.toLocaleString()}
      </Text>

      <YStack gap="$2" width="100%">
        {visibleTopRows.map((entry) => (
          <LeaderboardRow
            key={entry.address}
            entry={entry}
            isCurrentUser={entry.address === leaderboard.currentUserEntry?.address}
          />
        ))}

        {visibleBottomRows.length > 0 && (
          <XStack justifyContent="center" paddingVertical="$2">
            <Text secondary>...</Text>
          </XStack>
        )}

        {visibleBottomRows.map((entry) => (
          <LeaderboardRow key={entry.address} entry={entry} />
        ))}
      </YStack>

      <YStack gap="$2" alignItems="center">
        <Text variant="caption" secondary>
          Points update every few minutes.
        </Text>
        {/* Placeholder pagination — only one page exists in the mock dataset;
            real pagination wiring is out of scope for this mock-data phase. */}
        <XStack gap="$1">
          <Button size="sm" variant="secondary" disabled>
            <ButtonText>1</ButtonText>
          </Button>
          <Button size="sm" variant="ghost" disabled>
            <ButtonText>2</ButtonText>
          </Button>
          <Button size="sm" variant="ghost" disabled>
            <ButtonText>3</ButtonText>
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}
