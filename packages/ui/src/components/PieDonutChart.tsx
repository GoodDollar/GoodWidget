/**
 * PieDonutChart — categorical data as proportional arc segments.
 * `innerRadius > 0` renders as a donut with an optional center metric;
 * `innerRadius = 0` renders as a classic pie. Second of 5 planned analytics
 * chart components (Scorecard shipped first, in PR #142).
 *
 * Generalizes governance-widget's FundingDistributionChart SVG arc technique
 * (react-native-svg Circle + strokeDasharray/strokeDashoffset) into a
 * themeable packages/ui primitive any widget can compose, following
 * Scorecard.tsx's structural patterns (createComponent, useTheme,
 * formatMetricValue, golden-ratio spacing).
 */
import React from 'react'
import Svg, { Circle, G } from 'react-native-svg'
import { Text as TamaguiText, useTheme, XStack, YStack } from 'tamagui'
import { createComponent } from '../createComponent'
import { Card } from './Card'
import { formatMetricValue } from '../utils/formatMetricValue'
import { resolveThemeColor } from '../utils/resolveThemeColor'

export type PieDonutChartVariant = 'bare' | 'card'
export type PieDonutChartSort = 'descending' | 'ascending' | 'none'

export interface PieDonutChartDataItem {
  label: string
  value: number
  color?: string
}

export interface PieDonutChartProps {
  data: PieDonutChartDataItem[]
  title?: string
  innerRadius?: number
  centerLabel?: string
  centerValue?: string | number
  centerValueFormatter?: (value: number) => string
  centerSubLabel?: string
  maxSlices?: number
  otherLabel?: string
  sort?: PieDonutChartSort
  showLegend?: boolean
  showPercentages?: boolean
  onSegmentPress?: (item: PieDonutChartDataItem, index: number) => void
  variant?: PieDonutChartVariant
  testID?: string
  accessibilityLabel?: string
  width?: number
  height?: number
}

/**
 * Golden-ratio scale/spacing constants, matching Scorecard.tsx's values so
 * all analytics components breathe identically. Scorecard's own constants
 * are private (not exported) and out of this task's scope to modify, so
 * these are re-declared locally rather than imported.
 */
const CHART_BASE_SIZE_PX = 24
const GOLDEN_RATIO = 1.618
const MIN_FONT_SIZE_PX = 12
const clampFontSize = (px: number): number => Math.max(px, MIN_FONT_SIZE_PX)

const TITLE_SIZE_PX = clampFontSize(CHART_BASE_SIZE_PX)
const CENTER_VALUE_SIZE_PX = clampFontSize(CHART_BASE_SIZE_PX)
const CENTER_LABEL_SIZE_PX = clampFontSize(CHART_BASE_SIZE_PX / GOLDEN_RATIO ** 2)
const LEGEND_LABEL_SIZE_PX = clampFontSize(CHART_BASE_SIZE_PX / GOLDEN_RATIO)
const LEGEND_PERCENT_SIZE_PX = clampFontSize(CHART_BASE_SIZE_PX / GOLDEN_RATIO ** 2)

const TITLE_TO_CHART_GAP_PX = CHART_BASE_SIZE_PX / GOLDEN_RATIO
const CHART_TO_LEGEND_GAP_PX = CHART_BASE_SIZE_PX / GOLDEN_RATIO
const LEGEND_ROW_GAP_PX = CHART_BASE_SIZE_PX / GOLDEN_RATIO ** 2
const CARD_PADDING_PX = CHART_BASE_SIZE_PX

/** Multi-category palette, resolved to raw colors via useTheme() at render time. */
const CHART_COLOR_KEYS = ['primary', 'success', 'warning', 'colorDim', 'error'] as const

/** Legend rows are pressable when onSegmentPress is set — kept >=44pt tall for touch targets. */
const LEGEND_ROW_MIN_HEIGHT_PX = 44
const LEGEND_SWATCH_SIZE_PX = 10

/** Margin so rounded stroke caps don't get clipped against the SVG viewBox edge. */
const ARC_EDGE_MARGIN_PX = 3
/** Above this fraction the ring becomes imperceptibly thin; clamp keeps it visible. */
const MAX_INNER_RADIUS_FRACTION = 0.92

interface PieDonutChartSegment {
  label: string
  value: number
  color: string
  isAggregated: boolean
}

/**
 * Rounds to 1 decimal first, then checks for a whole number — avoids
 * floating-point noise (e.g. 24.999999) turning a should-be-integer
 * percentage into "25.0%" instead of "25%".
 */
function formatSegmentPercentage(value: number, total: number): string {
  const rounded = Math.round((value / total) * 1000) / 10
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`
}

/**
 * Filters invalid values, aggregates the smallest items beyond `maxSlices`
 * into a single "Other" segment (using the last palette color), then applies
 * the requested display sort. Aggregation always targets the smallest values
 * by magnitude regardless of `sort`, so "Other" consistently represents the
 * long tail rather than an arbitrary slice of it.
 */
function buildSegments(
  data: PieDonutChartDataItem[],
  maxSlices: number,
  otherLabel: string,
  sort: PieDonutChartSort,
  colors: readonly string[],
): PieDonutChartSegment[] {
  const validItems = data.filter((item) => Number.isFinite(item.value) && item.value > 0)
  const sortedByValueDescending = [...validItems].sort((a, b) => b.value - a.value)

  const exceedsMax = validItems.length > maxSlices
  const keepCount = Math.max(maxSlices - 1, 1)
  const keptItems = exceedsMax ? sortedByValueDescending.slice(0, keepCount) : sortedByValueDescending
  const overflowItems = exceedsMax ? sortedByValueDescending.slice(keepCount) : []
  const colorIndexByItem = new Map(keptItems.map((item, index) => [item, index]))

  // 'none' preserves the caller's original ordering for kept items rather
  // than the by-value order used above just to pick the aggregation set.
  const orderedKeptItems = sort === 'none' ? validItems.filter((item) => colorIndexByItem.has(item)) : keptItems

  const keptSegments: PieDonutChartSegment[] = orderedKeptItems.map((item) => ({
    label: item.label,
    value: item.value,
    color: item.color ?? colors[(colorIndexByItem.get(item) ?? 0) % colors.length],
    isAggregated: false,
  }))

  const segments =
    overflowItems.length > 0
      ? [
          ...keptSegments,
          {
            label: otherLabel,
            value: overflowItems.reduce((sum, item) => sum + item.value, 0),
            color: colors[colors.length - 1],
            isAggregated: true,
          },
        ]
      : keptSegments

  if (sort === 'descending') return [...segments].sort((a, b) => b.value - a.value)
  if (sort === 'ascending') return [...segments].sort((a, b) => a.value - b.value)
  return segments
}

interface ArcGeometry {
  size: number
  strokeWidth: number
  ringRadius: number
  circumference: number
}

/**
 * `innerRadius` is a fraction of the outer radius (0 = filled pie, closer to
 * 1 = thin ring). Ring thickness and radius are both derived from it so the
 * arc always spans exactly [holeRadius, outerRadius] with no manual tuning.
 */
function computeArcGeometry(width: number, height: number, innerRadius: number): ArcGeometry {
  const size = Math.min(width, height)
  const outerRadius = (size - ARC_EDGE_MARGIN_PX * 2) / 2
  const holeFraction = Math.min(Math.max(innerRadius, 0), MAX_INNER_RADIUS_FRACTION)
  const strokeWidth = outerRadius * (1 - holeFraction)
  const ringRadius = outerRadius - strokeWidth / 2

  return { size, strokeWidth, ringRadius, circumference: 2 * Math.PI * ringRadius }
}

const PieDonutFrame = createComponent(YStack, {
  name: 'PieDonutChart',
  alignItems: 'center',
})

const PieDonutTitleText = createComponent(TamaguiText, {
  name: 'PieDonutChartTitleText',
  fontFamily: '$body',
  fontWeight: '700',
  color: '$color',
  fontSize: TITLE_SIZE_PX,
  textAlign: 'center',
  marginBottom: TITLE_TO_CHART_GAP_PX,
})

const PieDonutCenterLabelText = createComponent(TamaguiText, {
  name: 'PieDonutChartCenterLabelText',
  fontFamily: '$body',
  color: '$placeholderColor',
  fontSize: CENTER_LABEL_SIZE_PX,
  textAlign: 'center',
})

const PieDonutCenterValueText = createComponent(TamaguiText, {
  name: 'PieDonutChartCenterValueText',
  fontFamily: '$body',
  fontWeight: '700',
  color: '$color',
  fontSize: CENTER_VALUE_SIZE_PX,
  textAlign: 'center',
})

const PieDonutLegendLabelText = createComponent(TamaguiText, {
  name: 'PieDonutChartLegendLabelText',
  fontFamily: '$body',
  color: '$color',
  fontSize: LEGEND_LABEL_SIZE_PX,
  flex: 1,
})

const PieDonutLegendPercentText = createComponent(TamaguiText, {
  name: 'PieDonutChartLegendPercentText',
  fontFamily: '$body',
  color: '$placeholderColor',
  fontSize: LEGEND_PERCENT_SIZE_PX,
})

const PieDonutSwatch = createComponent(YStack, {
  name: 'PieDonutChartSwatch',
  width: LEGEND_SWATCH_SIZE_PX,
  height: LEGEND_SWATCH_SIZE_PX,
  borderRadius: '$full',
})

function PieDonutCenterContent({
  centerLabel,
  centerValue,
  centerValueFormatter,
  centerSubLabel,
  maxWidth,
}: {
  centerLabel?: string
  centerValue?: string | number
  centerValueFormatter?: (value: number) => string
  centerSubLabel?: string
  maxWidth: number
}) {
  if (centerLabel === undefined && centerValue === undefined && centerSubLabel === undefined) {
    return null
  }

  // Default to 0 decimals for the center metric specifically: it sits in a
  // fixed-size hole, and "450K" fits that space far more reliably than
  // formatMetricValue's own default of 1 decimal ("450.0K"), which was
  // clipping at the default chart size even after correcting maxWidth above.
  const formattedValue =
    typeof centerValue === 'number'
      ? (centerValueFormatter ?? ((value: number) => formatMetricValue(value, 'compact', 0)))(centerValue)
      : centerValue

  return (
    <YStack position="absolute" alignItems="center" justifyContent="center" gap="$1" maxWidth={maxWidth} pointerEvents="none">
      {centerLabel ? (
        <PieDonutCenterLabelText numberOfLines={1} ellipsizeMode="tail">
          {centerLabel}
        </PieDonutCenterLabelText>
      ) : null}
      {formattedValue !== undefined ? (
        <PieDonutCenterValueText numberOfLines={1} ellipsizeMode="tail">
          {formattedValue}
        </PieDonutCenterValueText>
      ) : null}
      {centerSubLabel ? (
        <PieDonutCenterLabelText numberOfLines={1} ellipsizeMode="tail">
          {centerSubLabel}
        </PieDonutCenterLabelText>
      ) : null}
    </YStack>
  )
}

function PieDonutLegend({
  segments,
  totalValue,
  showPercentages,
  onSegmentPress,
}: {
  segments: PieDonutChartSegment[]
  totalValue: number
  showPercentages: boolean
  onSegmentPress?: (item: PieDonutChartDataItem, index: number) => void
}) {
  return (
    <YStack gap={LEGEND_ROW_GAP_PX} width="100%">
      {segments.map((segment, index) => {
        // Legend rows are non-native `<div>`s under XStack on web, so `role="button"`
        // alone doesn't make them keyboard-activatable — tabIndex opts them into the
        // tab order, and the key handler mirrors native <button> Enter/Space activation.
        const activateSegment = () => onSegmentPress?.({ label: segment.label, value: segment.value, color: segment.color }, index)
        return (
          <XStack
            key={`${segment.label}-${index}`}
            alignItems="center"
            gap="$2"
            minHeight={onSegmentPress ? LEGEND_ROW_MIN_HEIGHT_PX : undefined}
            cursor={onSegmentPress ? 'pointer' : undefined}
            onPress={onSegmentPress ? activateSegment : undefined}
            role={onSegmentPress ? 'button' : undefined}
            tabIndex={onSegmentPress ? 0 : undefined}
            onKeyDown={
              onSegmentPress
                ? (e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      activateSegment()
                    }
                  }
                : undefined
            }
            aria-label={onSegmentPress ? `View ${segment.label} detail` : undefined}
          >
            <PieDonutSwatch backgroundColor={segment.color} />
            <PieDonutLegendLabelText numberOfLines={1} ellipsizeMode="tail">
              {segment.label}
            </PieDonutLegendLabelText>
            {showPercentages ? (
              <PieDonutLegendPercentText>{formatSegmentPercentage(segment.value, totalValue)}</PieDonutLegendPercentText>
            ) : null}
          </XStack>
        )
      })}
    </YStack>
  )
}

function PieDonutChartContent({
  data,
  title,
  innerRadius = 0.6,
  centerLabel,
  centerValue,
  centerValueFormatter,
  centerSubLabel,
  maxSlices = 7,
  otherLabel = 'Other',
  sort = 'descending',
  showLegend = true,
  showPercentages = true,
  onSegmentPress,
  testID,
  accessibilityLabel,
  width = 188,
  height = 188,
}: Omit<PieDonutChartProps, 'variant'>) {
  const theme = useTheme()
  const colors = CHART_COLOR_KEYS.map((key) => resolveThemeColor(theme, key))
  const emptyRingColor = resolveThemeColor(theme, 'borderColor')

  const segments = buildSegments(data, maxSlices, otherLabel, sort, colors)
  const totalValue = segments.reduce((sum, segment) => sum + segment.value, 0)
  const isEmpty = segments.length === 0

  const geometry = computeArcGeometry(width, height, innerRadius)
  const center = geometry.size / 2
  // Available space for center label/value is the hole, not the ring: hole
  // radius is the ring's inner edge (ringRadius - strokeWidth / 2), and the
  // largest square that fits inside a circle of that radius has side
  // holeRadius * sqrt(2). The previous formula measured off ringRadius (the
  // stroke's centerline, not the hole) and shrank as innerRadius grew instead
  // of growing, which is why large center values were clipped to "450...".
  const holeRadius = geometry.ringRadius - geometry.strokeWidth / 2
  const centerContentMaxWidth = holeRadius * Math.SQRT2

  const resolvedAccessibilityLabel =
    accessibilityLabel ??
    `${title ?? 'Pie chart'}, ${segments.length} ${segments.length === 1 ? 'category' : 'categories'}${
      totalValue > 0 ? `, total ${formatMetricValue(totalValue)}` : ''
    }`

  let cumulativeDashOffset = 0

  return (
    <PieDonutFrame testID={testID} data-testid={testID}>
      {title ? <PieDonutTitleText>{title}</PieDonutTitleText> : null}
      <YStack width={geometry.size} height={geometry.size} alignItems="center" justifyContent="center">
        <Svg width={geometry.size} height={geometry.size} viewBox={`0 0 ${geometry.size} ${geometry.size}`} accessibilityRole="image" aria-label={resolvedAccessibilityLabel}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {isEmpty ? (
              <Circle
                cx={center}
                cy={center}
                r={geometry.ringRadius}
                stroke={emptyRingColor}
                strokeOpacity={0.18}
                strokeWidth={geometry.strokeWidth}
                fill="transparent"
                accessible={false}
              />
            ) : (
              segments.map((segment, index) => {
                const dashLength = (segment.value / totalValue) * geometry.circumference
                const dashOffset = -cumulativeDashOffset
                cumulativeDashOffset += dashLength

                return (
                  <Circle
                    key={`${segment.label}-${index}`}
                    cx={center}
                    cy={center}
                    r={geometry.ringRadius}
                    stroke={segment.color}
                    strokeWidth={geometry.strokeWidth}
                    strokeDasharray={`${dashLength} ${geometry.circumference - dashLength}`}
                    strokeDashoffset={dashOffset}
                    // "butt" (not "round"): round end-caps balloon into visible
                    // blobs whenever strokeWidth is large relative to radius,
                    // which happens at low innerRadius (a full pie is the
                    // extreme case, where strokeWidth equals the radius).
                    strokeLinecap="butt"
                    fill="transparent"
                    accessible={false}
                    onPress={onSegmentPress ? () => onSegmentPress({ label: segment.label, value: segment.value, color: segment.color }, index) : undefined}
                  />
                )
              })
            )}
          </G>
        </Svg>
        {isEmpty ? (
          <PieDonutCenterLabelText position="absolute">{centerLabel ?? 'No data'}</PieDonutCenterLabelText>
        ) : innerRadius > 0 ? (
          <PieDonutCenterContent
            centerLabel={centerLabel}
            centerValue={centerValue}
            centerValueFormatter={centerValueFormatter}
            centerSubLabel={centerSubLabel}
            maxWidth={centerContentMaxWidth}
          />
        ) : null}
      </YStack>
      {showLegend && !isEmpty ? (
        <YStack marginTop={CHART_TO_LEGEND_GAP_PX} width="100%">
          <PieDonutLegend segments={segments} totalValue={totalValue} showPercentages={showPercentages} onSegmentPress={onSegmentPress} />
        </YStack>
      ) : null}
    </PieDonutFrame>
  )
}

export function PieDonutChart({ variant = 'bare', ...contentProps }: PieDonutChartProps) {
  if (variant === 'card') {
    return (
      <Card alignItems="center" padding={CARD_PADDING_PX}>
        <PieDonutChartContent {...contentProps} />
      </Card>
    )
  }

  return <PieDonutChartContent {...contentProps} />
}
