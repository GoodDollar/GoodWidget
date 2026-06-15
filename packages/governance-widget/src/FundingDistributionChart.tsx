import Svg, { Circle, G } from 'react-native-svg'
import { Stack, useTheme } from 'tamagui'
import { Button, Card, Heading, Text, XStack, YStack } from '@goodwidget/ui'
import type { FundingDistributionChartProps, FundingProjectAllocation, GovernanceAmount } from './types'
import { clampPercentage, fundingAmountLabel } from './format'
import { renderGovernanceAmount } from './shared'

const DONUT_COLOR_KEYS = ['primary', 'success', 'warning', 'info', 'error'] as const

function resolveThemeColor(theme: ReturnType<typeof useTheme>, key: string, fallback: string): string {
  const themeValue = theme[key as keyof typeof theme]

  if (themeValue && typeof themeValue === 'object' && 'val' in themeValue) {
    return String(themeValue.val)
  }

  return fallback
}

function FundingLegend({
  projects,
  colors,
  onProjectPress,
}: {
  projects: FundingProjectAllocation[]
  colors: string[]
  onProjectPress?: (id: string) => void
}) {
  if (projects.length === 0) {
    return (
      <YStack padding="$3" borderRadius="$3" backgroundColor="$backgroundHover">
        <Text tone="secondary">No active funding distribution yet.</Text>
      </YStack>
    )
  }

  return (
    <YStack gap="$2" flex={1} minWidth={220}>
      {projects.map((project, index) => (
        <Button
          key={project.id}
          variant="list"
          onPress={onProjectPress ? () => onProjectPress(project.id) : undefined}
          aria-label={`Open ${project.name} allocation`}
        >
          <Stack width={12} height={12} borderRadius="$full" backgroundColor={colors[index]} />
          <YStack flex={1} gap="$1">
            <Text variant="label" truncate>
              {project.name}
            </Text>
            <Text variant="caption" tone="secondary">
              {fundingAmountLabel(project.amount)}
            </Text>
          </YStack>
          <Text variant="label" bold noWrap>
            {clampPercentage(project.percentage)}%
          </Text>
        </Button>
      ))}
    </YStack>
  )
}

function FundingDonut({
  projects,
  totalAmount,
  colors,
  onProjectPress,
}: {
  projects: FundingProjectAllocation[]
  totalAmount: GovernanceAmount
  colors: string[]
  onProjectPress?: (id: string) => void
}) {
  const size = 196
  const strokeWidth = 22
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <Stack width={size} height={size} alignItems="center" justifyContent="center">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityRole="image">
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors[0]}
            strokeOpacity={projects.length === 0 ? 0.18 : 0.08}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {projects.map((project, index) => {
            const percentage = clampPercentage(project.percentage)
            const dashLength = (percentage / 100) * circumference
            const dashOffset = -offset
            offset += dashLength

            return (
              <Circle
                key={project.id}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={colors[index]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                fill="transparent"
                onPress={onProjectPress ? () => onProjectPress(project.id) : undefined}
              />
            )
          })}
        </G>
      </Svg>
      <YStack position="absolute" alignItems="center" justifyContent="center" gap="$1" maxWidth={128}>
        {renderGovernanceAmount(totalAmount, 'md')}
        <Text variant="caption" tone="secondary" center>
          Total active funding
        </Text>
      </YStack>
    </Stack>
  )
}

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
