/**
 * TeamBars — one row per team: name, a bar sized against the largest value, and the value written next to it.
 * Every row always shows its name and its number, including a zero and bars too short to hold a label. The shared
 * BarChart in @goodwidget/ui does not guarantee that (it hides a value label on a bar under 20 px and thins category
 * names), which on this page would leave small teams unlabelled. A zero has a written value and no bar.
 */
import React from 'react'
import { Text, XStack, YStack } from '@goodwidget/ui'
import type { BarRow } from './model'

const NAME_CHAR_WIDTH_PX = 10
const VALUE_COLUMN_MIN_WIDTH_PX = 84
const BAR_HEIGHT_PX = 22

export interface TeamBarsProps {
  rows: BarRow[]
  /** Writes a value the way it appears next to its bar. */
  formatValue: (value: number) => string
  testID?: string
}

export function TeamBars({ rows, formatValue, testID }: TeamBarsProps) {
  const largest = rows.reduce((max, row) => Math.max(max, row.value), 0)
  const longestName = rows.reduce((max, row) => Math.max(max, row.team.length), 0)
  return (
    <YStack gap="$2" width="100%" data-testid={testID}>
      {rows.map((row) => {
        const share = largest > 0 ? Math.max(0, row.value) / largest : 0
        return (
          <XStack key={row.team} gap="$3" alignItems="center" data-testid={testID ? `${testID}-row-${row.team}` : undefined}>
            <Text tone="soft" width={longestName * NAME_CHAR_WIDTH_PX} maxWidth="38%" flexShrink={1}>
              {row.team}
            </Text>
            <YStack flex={1} height={BAR_HEIGHT_PX} justifyContent="center">
              {share > 0 ? (
                // A bar that would round to nothing still gets a visible sliver, so a small non-zero value is never read as zero.
                <YStack
                  height={BAR_HEIGHT_PX}
                  width={`${Math.max(share * 100, 0.8)}%`}
                  backgroundColor="$primary"
                  borderRadius="$1"
                />
              ) : null}
            </YStack>
            <Text minWidth={VALUE_COLUMN_MIN_WIDTH_PX} textAlign="right" data-testid={testID ? `${testID}-value-${row.team}` : undefined}>
              {formatValue(row.value)}
            </Text>
          </XStack>
        )
      })}
    </YStack>
  )
}
