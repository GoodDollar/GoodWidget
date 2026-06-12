import React from 'react'
import { Card, Heading, Text, XStack, YStack } from '@goodwidget/ui'
import { useTheme } from 'tamagui'
import { FundingDonut, FundingLegend } from './primitives'
import type { FundingDistributionChartProps } from './types'
import { DONUT_COLOR_KEYS, resolveThemeColor } from './utils'

export function FundingDistributionChart({
  totalAmount,
  projects,
  isStreaming = false,
  onProjectPress,
  testID,
}: FundingDistributionChartProps) {
  const theme = useTheme()
  const fallbackColors = ['#2563eb', '#16a34a', '#d97706', '#0891b2', '#dc2626']
  const colors = DONUT_COLOR_KEYS.map((key, index) => resolveThemeColor(theme, key, fallbackColors[index]))
  const total = { ...totalAmount, isStreaming: totalAmount.isStreaming ?? isStreaming }

  return (
    <Card data-testid={testID} width="100%" maxWidth={620} gap="$4">
      <YStack gap="$1">
        <Heading level={3}>Funding distribution</Heading>
        <Text tone="secondary">Current allocation across active governance projects.</Text>
      </YStack>
      <XStack flexWrap="wrap" justifyContent="center" alignItems="center" gap="$4">
        <FundingDonut projects={projects} totalAmount={total} colors={colors} onProjectPress={onProjectPress} />
        <FundingLegend projects={projects} colors={colors} onProjectPress={onProjectPress} />
      </XStack>
    </Card>
  )
}
