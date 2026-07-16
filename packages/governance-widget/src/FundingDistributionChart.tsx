import Svg, { Circle, G } from 'react-native-svg'
import { Stack, useTheme } from 'tamagui'
import { Heading, Text, XStack, YStack } from '@goodwidget/ui'
import type { FundingDistributionChartProps, FundingProjectAllocation, GovernanceAmount } from './types'
import { clampPercentage, fundingAmountLabel } from './format'
import { GovernanceWrapper, resolveThemeColor } from './shared'

const DONUT_COLOR_KEYS = ['primary', 'success', 'warning', 'colorDim', 'error'] as const

function FundingLegend({
  projects,
  colors,
  emptyStateLabel,
  onProjectPress,
}: {
  projects: FundingProjectAllocation[]
  colors: string[]
  emptyStateLabel: string
  onProjectPress?: (id: string) => void
}) {
  if (projects.length === 0) {
    return (
      <YStack padding="$3" borderRadius="$3" backgroundColor="$backgroundHover">
        <Text tone="secondary">{emptyStateLabel}</Text>
      </YStack>
    )
  }

  return (
    <YStack gap="$4" width="100%">
      {projects.map((project, index) => (
        <XStack
          key={project.id}
          alignItems="center"
          gap="$3"
          cursor={onProjectPress ? 'pointer' : undefined}
          onPress={onProjectPress ? () => onProjectPress(project.id) : undefined}
          role={onProjectPress ? 'button' : undefined}
          aria-label={`Open ${project.name} allocation`}
        >
          <Stack width={18} alignItems="center" justifyContent="center">
            <Stack width={11} height={11} borderRadius="$full" backgroundColor={colors[index]} />
          </Stack>
          <YStack flex={1} gap="$1">
            <Text tone="default" fontWeight="700">
              {project.name}
            </Text>
            <Text variant="caption" tone="secondary">
              {clampPercentage(project.percentage)}% - {fundingAmountLabel(project.amount)}
            </Text>
          </YStack>
        </XStack>
      ))}
    </YStack>
  )
}

function FundingDonut({
  projects,
  totalAmount,
  centerLabel,
  colors,
  onProjectPress,
}: {
  projects: FundingProjectAllocation[]
  totalAmount: GovernanceAmount
  centerLabel: string
  colors: string[]
  onProjectPress?: (id: string) => void
}) {
  const size = 188
  const strokeWidth = 20
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
      <YStack position="absolute" alignItems="center" justifyContent="center" gap="$1" maxWidth={116}>
        <Text variant="label" tone="secondary" center>
          {centerLabel}
        </Text>
        <Heading level={5} color="$primary" textAlign="center">
          {fundingAmountLabel(totalAmount)}
        </Heading>
        <Text variant="caption" tone="secondary" center>
          {totalAmount.streamLabel ?? 'Current allocation'}
        </Text>
      </YStack>
    </Stack>
  )
}

function FundingDistributionChartContent({
  title = 'Funding distribution',
  centerLabel = 'Total active funding',
  emptyStateLabel = 'No active funding distribution yet.',
  totalAmount,
  projects,
  isStreaming = false,
  stateLabel,
  onProjectPress,
}: FundingDistributionChartProps) {
  const theme = useTheme()
  const colors = DONUT_COLOR_KEYS.map((key) => resolveThemeColor(theme as unknown as Record<string, unknown>, key))
  const total = { ...totalAmount, isStreaming: totalAmount.isStreaming ?? isStreaming }

  return (
    <>
      <Heading level={4} color="$color">
        {title}
      </Heading>
      <YStack alignItems="center" gap="$4">
        {stateLabel ? (
          <Text variant="caption" tone="secondary" center>
            {stateLabel}
          </Text>
        ) : null}
        <FundingDonut
          projects={projects}
          totalAmount={total}
          centerLabel={centerLabel}
          colors={colors}
          onProjectPress={onProjectPress}
        />
        <FundingLegend projects={projects} colors={colors} emptyStateLabel={emptyStateLabel} onProjectPress={onProjectPress} />
      </YStack>
    </>
  )
}

export function FundingDistributionChart(props: FundingDistributionChartProps) {
  return (
    <GovernanceWrapper data-testid={props.testID} maxWidth={340}>
      <FundingDistributionChartContent {...props} />
    </GovernanceWrapper>
  )
}
