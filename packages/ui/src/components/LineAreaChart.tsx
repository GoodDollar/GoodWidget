/**
 * LineAreaChart — time-series and continuous-data trends via connected line
 * segments, optionally filled to a gradient area below the line. Third of 5
 * planned analytics chart components (Scorecard, PieDonutChart, BarChart
 * shipped first, in PR #142) and the most complex of the family: multi-series
 * overlay, three interpolation modes, gap handling, a secondary y-axis, and
 * reference lines.
 *
 * Follows Scorecard.tsx's structural patterns (createComponent, useTheme,
 * formatMetricValue, golden-ratio spacing) and BarChart.tsx's axis/grid/
 * nice-tick/in-SVG-label conventions.
 */
import React, { useId, useState } from 'react'
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg'
import { Text as TamaguiText, useTheme, XStack, YStack } from 'tamagui'
import { createComponent } from '../createComponent'
import { Card } from './Card'
import { ChartTooltip, estimateChartTooltipWidthPx, type ChartTooltipRow } from './ChartTooltip'
import { CHART_FONT_FAMILY } from '../utils/chartFontFamily'
import { formatChartAxisValue } from '../utils/formatMetricValue'
import { resolveThemeColor } from '../utils/resolveThemeColor'
import {
  computeChartScaleRatio,
  computeShrinkToFitFontSizePx,
  scaleEdgeInsets,
  scalePx,
} from '../utils/chartResponsiveScale'
import { estimateTextWidthPx } from '../utils/textWidthEstimate'
import { computeXAxisLabelPlan } from '../utils/xAxisLabelPlan'
import { useMeasuredWidth } from '../hooks/useMeasuredWidth'

export type LineAreaChartVariant = 'bare' | 'card'
export type LineAreaChartInterpolation = 'linear' | 'monotone' | 'step'

export interface LineAreaChartDataItem {
  x: string | number
  y: number | null
  series?: string
}

export interface LineAreaChartSeriesDef {
  key: string
  label: string
  color?: string
  strokeDasharray?: string
}

export interface LineAreaChartReferenceLine {
  value: number
  label?: string
  color?: string
}

export interface LineAreaChartSecondaryAxis {
  key: string
  label?: string
  formatter?: (value: number) => string
}

export interface LineAreaChartPadding {
  top: number
  right: number
  bottom: number
  left: number
}

export interface LineAreaChartProps {
  data: LineAreaChartDataItem[]
  title?: string
  series?: LineAreaChartSeriesDef[]
  type?: LineAreaChartInterpolation
  showArea?: boolean
  areaOpacity?: number
  showDots?: boolean | 'auto'
  showGrid?: boolean
  connectNulls?: boolean
  strokeWidth?: number
  xAxisLabel?: string
  yAxisLabel?: string
  xAxisFormatter?: (value: string | number) => string
  yAxisFormatter?: (value: number) => string
  yAxisDomain?: [number | 'auto', number | 'auto']
  secondaryYAxis?: LineAreaChartSecondaryAxis
  referenceLines?: LineAreaChartReferenceLine[]
  onPointPress?: (point: LineAreaChartDataItem, seriesKey: string) => void
  variant?: LineAreaChartVariant
  testID?: string
  accessibilityLabel?: string
  width?: number | string
  height?: number
  padding?: Partial<LineAreaChartPadding>
}

/**
 * Golden-ratio scale/spacing constants, matching Scorecard.tsx's values so
 * all analytics components breathe identically. Scorecard's own constants
 * are private (not exported) and out of this task's scope to modify, so
 * these are re-declared locally rather than imported (same as PieDonutChart
 * and BarChart before it).
 *
 * These are *base* sizes tuned for a chart rendered at REFERENCE_WIDTH_PX —
 * LineAreaChartContent scales them by the chart's actual measured width (see
 * chartResponsiveScale.ts) rather than using them as fixed pixel values, so
 * layout holds up from phone-width widgets to 4K embeds.
 */
const CHART_BASE_SIZE_PX = 24
const GOLDEN_RATIO = 1.618
const MIN_FONT_SIZE_PX = 12
const clampFontSize = (px: number): number => Math.max(px, MIN_FONT_SIZE_PX)

const TITLE_BASE_SIZE_PX = CHART_BASE_SIZE_PX
const AXIS_TITLE_BASE_SIZE_PX = CHART_BASE_SIZE_PX / GOLDEN_RATIO
const TICK_LABEL_BASE_SIZE_PX = CHART_BASE_SIZE_PX / GOLDEN_RATIO ** 2
const REFERENCE_LABEL_BASE_SIZE_PX = CHART_BASE_SIZE_PX / GOLDEN_RATIO ** 2
const LEGEND_LABEL_BASE_SIZE_PX = CHART_BASE_SIZE_PX / GOLDEN_RATIO

const TITLE_TO_CHART_GAP_BASE_PX = CHART_BASE_SIZE_PX / GOLDEN_RATIO
const CHART_TO_LEGEND_GAP_BASE_PX = CHART_BASE_SIZE_PX / GOLDEN_RATIO
const CARD_PADDING_PX = CHART_BASE_SIZE_PX

/** Multi-category palette, resolved to raw colors via useTheme() at render time. */
const CHART_COLOR_KEYS = ['primary', 'success', 'warning', 'colorDim', 'error'] as const

const DEFAULT_PADDING: LineAreaChartPadding = { top: 16, right: 16, bottom: 40, left: 48 }
// Mirrors DEFAULT_PADDING.left — secondary-axis tick labels need the same room on the right that primary labels get on the left.
const SECONDARY_AXIS_RIGHT_PADDING_BASE_PX = 48
/** Reference width both the base sizes above and DEFAULT_PADDING were tuned against.
 * Also the fallback viewBox width used for the single frame before a responsive
 * (string `width`) chart's first real layout measurement arrives. */
const REFERENCE_WIDTH_PX = 400

const DESIRED_TICK_COUNT = 5
const NICE_STEP_MULTIPLES = [1, 2, 5, 10] as const
/** "Y extends 10% beyond data range" per spec rule 7. */
const DOMAIN_PADDING_FRACTION = 0.1

const DOT_RADIUS_PX = 3
const DOT_AUTO_THRESHOLD = 20
/** Invisible larger hit-target so pressable dots still meet the 44pt touch-target baseline. */
const DOT_TOUCH_TARGET_RADIUS_PX = 22
const LEGEND_SWATCH_SIZE_PX = 10
/** Grid lines need enough contrast to be useful without competing with the series. */
const GRID_LINE_OPACITY = 0.22
const GRID_ZERO_LINE_OPACITY = 0.48
const GRID_LINE_WIDTH_PX = 1
const GRID_ZERO_LINE_WIDTH_PX = 1.25
function isValidY(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value)
}

interface AxisScale {
  min: number
  max: number
  step: number
  ticks: number[]
}

function computeNiceStep(roughStep: number): number {
  if (roughStep <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const normalized = roughStep / magnitude
  const niceMultiple = NICE_STEP_MULTIPLES.find((multiple) => multiple >= normalized) ?? 10
  return niceMultiple * magnitude
}

/**
 * Nice-number y-scale: pads the data range 10% each direction (or honors an
 * explicit domain override), then rounds to a human-friendly step. Unlike
 * Bar's scale this does not force zero-inclusion — line/area charts commonly
 * show a windowed range where zero isn't meaningful (e.g. a price series).
 */
function computeNiceAxisScale(
  values: number[],
  domainOverride?: [number | 'auto', number | 'auto'],
): AxisScale {
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const range = dataMax - dataMin || Math.abs(dataMax) || 1

  // QA fix: when every value is already >= 0, the 10% domain padding below
  // still pushed the floor below zero (e.g. a 0..50 series rendering as
  // -2..56), showing a negative axis region no non-negative dataset should
  // have. Floor the auto-padded min at 0 in that case; a caller-supplied
  // `domainOverride[0]` still wins, since that's an explicit opt-out.
  const paddedMinRaw = dataMin - range * DOMAIN_PADDING_FRACTION
  const paddedMin = dataMin >= 0 ? Math.max(0, paddedMinRaw) : paddedMinRaw
  const paddedMax = dataMax + range * DOMAIN_PADDING_FRACTION

  const requestedMin = domainOverride?.[0]
  const requestedMax = domainOverride?.[1]
  const rawMin = requestedMin !== undefined && requestedMin !== 'auto' ? requestedMin : paddedMin
  const rawMax = requestedMax !== undefined && requestedMax !== 'auto' ? requestedMax : paddedMax

  const step = computeNiceStep((rawMax - rawMin) / (DESIRED_TICK_COUNT - 1) || 1)
  const min = Math.floor(rawMin / step) * step
  const max = Math.ceil(rawMax / step) * step

  const ticks: number[] = []
  for (let tick = min; tick <= max + step / 2; tick += step) {
    ticks.push(Math.round(tick / step) * step)
  }

  return { min, max, step, ticks }
}

/** Unique, order-preserving x categories across the whole dataset (series may interleave the same x values, as in the multi-axis mock). */
function buildXCategories(data: LineAreaChartDataItem[]): Array<string | number> {
  const seen = new Set<string>()
  const categories: Array<string | number> = []
  for (const item of data) {
    const key = String(item.x)
    if (!seen.has(key)) {
      seen.add(key)
      categories.push(item.x)
    }
  }
  return categories
}

interface ResolvedSeriesPoint {
  x: string | number
  y: number | null
}

interface ResolvedSeries {
  key: string
  label: string
  color: string
  strokeDasharray?: string
  points: ResolvedSeriesPoint[]
}

/** Groups raw data rows by series key (auto-detected from `item.series`, defaulting to a single implicit series), realigned onto the shared x-category axis so every series has one entry per category (null where that series has no row for that x). */
function resolveSeries(
  data: LineAreaChartDataItem[],
  seriesDefs: LineAreaChartSeriesDef[] | undefined,
  xCategories: Array<string | number>,
  colors: readonly string[],
): ResolvedSeries[] {
  const seriesKeys =
    seriesDefs?.map((definition) => definition.key) ??
    Array.from(new Set(data.map((item) => item.series ?? 'default')))

  return seriesKeys.map((key, index) => {
    const definition = seriesDefs?.find((candidate) => candidate.key === key)
    const valueByX = new Map<string, number | null>()
    data
      .filter((item) => (item.series ?? 'default') === key)
      .forEach((item) => {
        valueByX.set(String(item.x), isValidY(item.y) ? item.y : null)
      })

    return {
      key,
      label: definition?.label ?? key,
      color: definition?.color ?? colors[index % colors.length],
      strokeDasharray: definition?.strokeDasharray,
      points: xCategories.map((x) => ({ x, y: valueByX.get(String(x)) ?? null })),
    }
  })
}

interface PixelPoint {
  x: number
  y: number | null
}

/** Splits a series' points into contiguous drawable runs. connectNulls=true collapses all valid points into one run (bridging gaps); false (default) breaks the path at each null, leaving a visible gap. */
function buildRuns(
  points: PixelPoint[],
  connectNulls: boolean,
): Array<Array<{ x: number; y: number }>> {
  if (connectNulls) {
    const valid = points.filter((point): point is { x: number; y: number } => point.y !== null)
    return valid.length > 0 ? [valid] : []
  }

  const runs: Array<Array<{ x: number; y: number }>> = []
  let current: Array<{ x: number; y: number }> = []
  for (const point of points) {
    if (point.y !== null) {
      current.push(point as { x: number; y: number })
    } else if (current.length > 0) {
      runs.push(current)
      current = []
    }
  }
  if (current.length > 0) runs.push(current)
  return runs
}

function buildLinearPath(points: Array<{ x: number; y: number }>): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

/** 'step' = hold value until next point (H then V), per spec rule 2. */
function buildStepPath(points: Array<{ x: number; y: number }>): string {
  const segments = [`M ${points[0].x} ${points[0].y}`]
  for (let i = 1; i < points.length; i++) {
    segments.push(`H ${points[i].x}`, `V ${points[i].y}`)
  }
  return segments.join(' ')
}

/**
 * Fritsch–Carlson monotone cubic Hermite spline: a smooth curve through every
 * point that is mathematically guaranteed not to overshoot past neighboring
 * values (unlike 'natural'/'basis' splines, which the spec explicitly
 * forbids for that reason).
 */
function buildMonotonePath(points: Array<{ x: number; y: number }>): string {
  const n = points.length
  if (n < 2) return ''
  if (n === 2) return buildLinearPath(points)

  const dx: number[] = []
  const slope: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1].x - points[i].x
    slope[i] = dx[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / dx[i]
  }

  const tangent: number[] = [slope[0]]
  for (let i = 1; i < n - 1; i++) {
    tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
  }
  tangent[n - 1] = slope[n - 2]

  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0
      tangent[i + 1] = 0
      continue
    }
    const alpha = tangent[i] / slope[i]
    const beta = tangent[i + 1] / slope[i]
    if (alpha < 0) tangent[i] = 0
    if (beta < 0) tangent[i + 1] = 0

    const magnitude = alpha * alpha + beta * beta
    if (magnitude > 9) {
      const rescale = 3 / Math.sqrt(magnitude)
      tangent[i] = rescale * alpha * slope[i]
      tangent[i + 1] = rescale * beta * slope[i]
    }
  }

  const segments = [`M ${points[0].x} ${points[0].y}`]
  for (let i = 0; i < n - 1; i++) {
    const third = dx[i] / 3
    const cp1x = points[i].x + third
    const cp1y = points[i].y + tangent[i] * third
    const cp2x = points[i + 1].x - third
    const cp2y = points[i + 1].y - tangent[i + 1] * third
    segments.push(`C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${points[i + 1].x} ${points[i + 1].y}`)
  }
  return segments.join(' ')
}

function buildPath(
  points: Array<{ x: number; y: number }>,
  type: LineAreaChartInterpolation,
): string {
  if (points.length < 2) return ''
  if (type === 'step') return buildStepPath(points)
  if (type === 'monotone') return buildMonotonePath(points)
  return buildLinearPath(points)
}

/** Closes the line path down to the baseline and back to its start, ready to be filled by the vertical gradient. */
function buildAreaPath(
  points: Array<{ x: number; y: number }>,
  type: LineAreaChartInterpolation,
  baselineY: number,
): string {
  if (points.length < 2) return ''
  const linePath = buildPath(points, type)
  const first = points[0]
  const last = points[points.length - 1]
  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`
}

/** Single data point (rule 12) or an explicit showDots=false both still need a visible dot when a series has exactly one plottable value — otherwise it would render nothing at all. */
function resolveShowDotsForSeries(showDots: boolean | 'auto', validPointCount: number): boolean {
  if (validPointCount === 1) return true
  if (showDots === 'auto') return validPointCount > 0 && validPointCount < DOT_AUTO_THRESHOLD
  return showDots
}

/** Scales DEFAULT_PADDING (and the secondary-axis right-padding override) to the
 * chart's actual size, then layers an explicit per-instance `padding` override on
 * top unscaled — an override is the caller opting out of the default for that
 * edge, not a value we should re-scale. */
function mergePadding(
  padding: Partial<LineAreaChartPadding> | undefined,
  hasSecondaryAxis: boolean,
  scaleRatio: number,
): LineAreaChartPadding {
  const scaledDefaults = scaleEdgeInsets(DEFAULT_PADDING, scaleRatio)
  const defaults = hasSecondaryAxis
    ? { ...scaledDefaults, right: scalePx(SECONDARY_AXIS_RIGHT_PADDING_BASE_PX, scaleRatio) }
    : scaledDefaults
  return { ...defaults, ...padding }
}

const LineAreaFrame = createComponent(YStack, {
  name: 'LineAreaChart',
  alignItems: 'center',
  width: '100%',
  // Without this, a flex ancestor with alignItems:"center" (e.g. GoodWidgetProvider's
  // content Stack) lets this frame shrink-wrap to its own content's intrinsic width
  // instead of being bound by the actual space it's given.
  alignSelf: 'stretch',
})

/**
 * An explicit pixel `width` (e.g. a wide-embed stress test) is intentionally
 * not responsive, so when the host container is narrower than that width the
 * chart can't reflow or shrink without becoming illegible — this scrolls it
 * horizontally instead of relying on an ancestor to clip it, mirroring
 * DataTable's own DataTableScrollContainer for the same wide-content case.
 */
const LineAreaScrollContainer = createComponent(YStack, {
  name: 'LineAreaChartScrollContainer',
  width: '100%',
  // Same shrink-wrap issue as LineAreaFrame above: without this, this container
  // grows to match the chart's own width instead of being clamped by LineAreaFrame,
  // which silently defeats overflow:"auto" (nothing is left to scroll within).
  alignSelf: 'stretch',
  overflow: 'auto' as const,
})

/**
 * Positions the hover tooltip over the plot — deliberately not given a
 * `width`/`alignSelf: 'stretch'` (unlike LineAreaScrollContainer above), so it
 * shrink-wraps to the SVG's own rendered size and doesn't disturb the wide
 * fixed-width chart's horizontal-scroll behavior.
 */
const LineAreaPlotArea = createComponent(YStack, {
  name: 'LineAreaChartPlotArea',
  position: 'relative',
})

const LineAreaTitleText = createComponent(TamaguiText, {
  name: 'LineAreaChartTitleText',
  fontFamily: '$body',
  fontWeight: '700',
  color: '$color',
  fontSize: TITLE_BASE_SIZE_PX,
  textAlign: 'center',
  marginBottom: TITLE_TO_CHART_GAP_BASE_PX,
})

const LineAreaLegendLabelText = createComponent(TamaguiText, {
  name: 'LineAreaChartLegendLabelText',
  fontFamily: '$body',
  color: '$color',
  fontSize: LEGEND_LABEL_BASE_SIZE_PX,
})

const LineAreaSwatch = createComponent(YStack, {
  name: 'LineAreaChartSwatch',
  width: LEGEND_SWATCH_SIZE_PX,
  height: LEGEND_SWATCH_SIZE_PX,
  borderRadius: '$full',
})

function LineAreaLegend({
  seriesList,
  legendLabelSizePx,
}: {
  seriesList: ResolvedSeries[]
  legendLabelSizePx: number
}) {
  return (
    <XStack gap="$4" flexWrap="wrap" justifyContent="center">
      {seriesList.map((series) => (
        <XStack key={series.key} alignItems="center" gap="$2">
          <LineAreaSwatch backgroundColor={series.color} />
          <LineAreaLegendLabelText fontSize={legendLabelSizePx}>
            {series.label}
          </LineAreaLegendLabelText>
        </XStack>
      ))}
    </XStack>
  )
}

function LineAreaChartContent({
  data,
  title,
  series: seriesDefs,
  type = 'linear',
  showArea = false,
  areaOpacity = 0.15,
  showDots = 'auto',
  showGrid = true,
  connectNulls = false,
  strokeWidth = 2,
  xAxisLabel,
  yAxisLabel,
  xAxisFormatter = (value) => String(value),
  yAxisFormatter = formatChartAxisValue,
  yAxisDomain,
  secondaryYAxis,
  referenceLines = [],
  onPointPress,
  testID,
  accessibilityLabel,
  width = '100%',
  height = 200,
  padding,
}: Omit<LineAreaChartProps, 'variant'>) {
  const theme = useTheme()
  const gradientIdPrefix = useId()
  // QA fix: hovering a point previously showed nothing. Tracks which
  // x-category index the pointer is nearest to, or null when not hovering.
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const colors = CHART_COLOR_KEYS.map((key) => resolveThemeColor(theme, key))
  const gridColor = resolveThemeColor(theme, 'colorDim')
  const axisLabelColor = resolveThemeColor(theme, 'placeholderColor')

  const isEmpty = data.length === 0
  const xCategories = buildXCategories(data)
  const resolvedSeriesList = resolveSeries(data, seriesDefs, xCategories, colors)

  const secondarySeries = secondaryYAxis
    ? resolvedSeriesList.find((series) => series.key === secondaryYAxis.key)
    : undefined
  const primarySeriesList = resolvedSeriesList.filter((series) => series !== secondarySeries)

  const primaryValues = primarySeriesList.flatMap((series) =>
    series.points.map((point) => point.y).filter(isValidY),
  )
  const secondaryValues = secondarySeries?.points.map((point) => point.y).filter(isValidY) ?? []

  const primaryScale = computeNiceAxisScale(
    primaryValues.length > 0 ? primaryValues : referenceLines.map((line) => line.value),
    yAxisDomain,
  )
  const secondaryScale = secondaryValues.length > 0 ? computeNiceAxisScale(secondaryValues) : null

  // A string `width` (e.g. the default "100%") only tells the SVG element itself how
  // to stretch — it carries no pixel value we can lay points out against, so that case
  // needs the frame's real rendered width measured via onLayout instead.
  const isResponsiveWidth = typeof width !== 'number'
  const { measuredWidthPx, onLayout } = useMeasuredWidth(REFERENCE_WIDTH_PX)
  const viewBoxWidth = isResponsiveWidth ? measuredWidthPx : width

  const scaleRatio = computeChartScaleRatio(viewBoxWidth, REFERENCE_WIDTH_PX)
  // QA fix: titles were scaling up with chart width (rendering ~H2/H3-sized on
  // wide charts) instead of staying a fixed Tamagui H5. Keep the base size
  // unscaled — computeShrinkToFitFontSizePx below still shrinks it down for
  // narrow charts/long titles, it just never grows past the spec size.
  const titleSizePx = clampFontSize(TITLE_BASE_SIZE_PX)
  // The title renders as a sibling of the SVG inside the chart frame, at the frame's
  // full width (viewBoxWidth) — not just the inner plot area — so a long title at a
  // scaled-up font size can otherwise widen past the frame regardless of plot layout.
  const fittedTitleSizePx = title
    ? computeShrinkToFitFontSizePx(title, titleSizePx, viewBoxWidth, MIN_FONT_SIZE_PX)
    : titleSizePx
  const titleToChartGapPx = scalePx(TITLE_TO_CHART_GAP_BASE_PX, scaleRatio)
  const chartToLegendGapPx = scalePx(CHART_TO_LEGEND_GAP_BASE_PX, scaleRatio)
  const axisTitleSizePx = clampFontSize(scalePx(AXIS_TITLE_BASE_SIZE_PX, scaleRatio))
  const tickLabelSizePx = clampFontSize(scalePx(TICK_LABEL_BASE_SIZE_PX, scaleRatio))
  const referenceLabelSizePx = clampFontSize(scalePx(REFERENCE_LABEL_BASE_SIZE_PX, scaleRatio))
  const legendLabelSizePx = clampFontSize(scalePx(LEGEND_LABEL_BASE_SIZE_PX, scaleRatio))

  const resolvedPadding = mergePadding(padding, secondaryScale !== null, scaleRatio)
  const plotWidth = viewBoxWidth - resolvedPadding.left - resolvedPadding.right
  const plotHeight = height - resolvedPadding.top - resolvedPadding.bottom

  const resolvedAccessibilityLabel =
    accessibilityLabel ??
    `${title ?? 'Line chart'}, ${resolvedSeriesList.length} ${resolvedSeriesList.length === 1 ? 'series' : 'series'}, ${xCategories.length} data points`

  const categoryCount = xCategories.length
  const xPixelForIndex = (index: number): number =>
    categoryCount > 1 ? (index / (categoryCount - 1)) * plotWidth : plotWidth / 2

  const yPixelForValue = (value: number, scale: AxisScale): number => {
    const domain = scale.max - scale.min || 1
    return plotHeight - ((value - scale.min) / domain) * plotHeight
  }

  // Base label spacing entirely on the widest *formatted* label actually in
  // use (e.g. full ISO dates vs short numbers) — no fixed-pixel floor, since
  // a floor would override genuinely short labels' real measured width and
  // make the chart pack them more sparsely than their content requires.
  const widestXLabelWidthPx = xCategories.reduce<number>(
    (widest, category) => Math.max(widest, estimateTextWidthPx(xAxisFormatter(category), tickLabelSizePx)),
    0,
  )
  const xAxisLabelPlan = computeXAxisLabelPlan({
    categoryCount,
    xPixelForIndex,
    labelWidthPx: widestXLabelWidthPx,
  })

  // Maps a pointer position to the nearest x-category index, in the plot's
  // own coordinate space (0..plotWidth) — the SVG always renders at
  // `viewBoxWidth` CSS pixels, so `getBoundingClientRect()` needs no unit
  // conversion, only subtracting the left padding the plot area starts at.
  const handlePlotPointerMove = (event: {
    clientX: number
    currentTarget: { getBoundingClientRect?: () => DOMRect }
  }) => {
    if (isEmpty || categoryCount === 0) return
    const rect = event.currentTarget.getBoundingClientRect?.()
    if (!rect) return
    const plotX = event.clientX - rect.left - resolvedPadding.left
    const clampedFraction = Math.min(1, Math.max(0, plotX / Math.max(1, plotWidth)))
    setHoveredIndex(Math.round(clampedFraction * (categoryCount - 1)))
  }

  const handlePlotPointerLeave = () => setHoveredIndex(null)

  const tooltipRows: ChartTooltipRow[] =
    hoveredIndex !== null
      ? resolvedSeriesList.reduce<ChartTooltipRow[]>((rows, seriesItem) => {
          const point = seriesItem.points[hoveredIndex]
          if (!point || !isValidY(point.y)) return rows
          const formatter =
            seriesItem === secondarySeries
              ? (secondaryYAxis?.formatter ?? formatChartAxisValue)
              : yAxisFormatter
          rows.push({ color: seriesItem.color, label: seriesItem.label, value: formatter(point.y) })
          return rows
        }, [])
      : []

  // Center the tooltip on the hovered point, then clamp so it never overhangs
  // the chart frame. Width is estimated from this hover's actual header/rows
  // so the clamp matches what ChartTooltip itself will render at.
  const tooltipWidthPx =
    hoveredIndex !== null ? estimateChartTooltipWidthPx(xAxisFormatter(xCategories[hoveredIndex]), tooltipRows) : 0
  const maxTooltipLeftPx = Math.max(0, viewBoxWidth - tooltipWidthPx)
  const tooltipLeftPx =
    hoveredIndex !== null
      ? Math.min(
          maxTooltipLeftPx,
          Math.max(0, resolvedPadding.left + xPixelForIndex(hoveredIndex) - tooltipWidthPx / 2),
        )
      : 0

  return (
    <LineAreaFrame
      testID={testID}
      data-testid={testID}
      width={isResponsiveWidth ? '100%' : undefined}
      onLayout={onLayout}
    >
      {title ? (
        <LineAreaTitleText fontSize={fittedTitleSizePx} marginBottom={titleToChartGapPx}>
          {title}
        </LineAreaTitleText>
      ) : null}
      <LineAreaScrollContainer>
        <LineAreaPlotArea onMouseMove={handlePlotPointerMove} onMouseLeave={handlePlotPointerLeave}>
          <Svg
            width={width}
            height={height}
            viewBox={`0 0 ${viewBoxWidth} ${height}`}
            preserveAspectRatio="none"
            accessibilityRole="image"
            aria-label={resolvedAccessibilityLabel}
          >
            <Defs>
              {resolvedSeriesList.map((seriesItem) => (
                <LinearGradient
                  key={seriesItem.key}
                  id={`${gradientIdPrefix}-${seriesItem.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor={seriesItem.color} stopOpacity={0.3} />
                  <Stop offset="1" stopColor={seriesItem.color} stopOpacity={0.05} />
                </LinearGradient>
              ))}
            </Defs>

            {isEmpty ? (
              <G accessible={false}>
                <Line
                  x1={resolvedPadding.left}
                  y1={resolvedPadding.top + plotHeight}
                  x2={resolvedPadding.left + plotWidth}
                  y2={resolvedPadding.top + plotHeight}
                  stroke={gridColor}
                  strokeOpacity={0.3}
                  strokeWidth={1}
                />
                <SvgText
                  x={resolvedPadding.left + plotWidth / 2}
                  y={resolvedPadding.top + plotHeight / 2}
                  fontSize={tickLabelSizePx}
                  fontFamily={CHART_FONT_FAMILY}
                  fill={axisLabelColor}
                  textAnchor="middle"
                >
                  No data
                </SvgText>
              </G>
            ) : (
              <G transform={`translate(${resolvedPadding.left}, ${resolvedPadding.top})`}>
                {showGrid ? (
                  <G accessible={false}>
                    {primaryScale.ticks.map((tick) => {
                      const tickY = yPixelForValue(tick, primaryScale)
                      const isZeroTick = tick === 0
                      return (
                        <Line
                          key={tick}
                          x1={0}
                          y1={tickY}
                          x2={plotWidth}
                          y2={tickY}
                          stroke={gridColor}
                          strokeOpacity={isZeroTick ? GRID_ZERO_LINE_OPACITY : GRID_LINE_OPACITY}
                          strokeWidth={isZeroTick ? GRID_ZERO_LINE_WIDTH_PX : GRID_LINE_WIDTH_PX}
                        />
                      )
                    })}
                  </G>
                ) : null}

                <G accessible={false}>
                  {primaryScale.ticks.map((tick) => (
                    <SvgText
                      key={tick}
                      x={-8}
                      y={yPixelForValue(tick, primaryScale)}
                      fontSize={tickLabelSizePx}
                      fontFamily={CHART_FONT_FAMILY}
                      fill={axisLabelColor}
                      textAnchor="end"
                      alignmentBaseline="middle"
                    >
                      {yAxisFormatter(tick)}
                    </SvgText>
                  ))}
                  {secondaryScale
                    ? secondaryScale.ticks.map((tick) => (
                        <SvgText
                          key={tick}
                          x={plotWidth + 8}
                          y={yPixelForValue(tick, secondaryScale)}
                          fontSize={tickLabelSizePx}
                          fontFamily={CHART_FONT_FAMILY}
                          fill={secondarySeries?.color ?? axisLabelColor}
                          textAnchor="start"
                          alignmentBaseline="middle"
                        >
                          {(secondaryYAxis?.formatter ?? formatChartAxisValue)(tick)}
                        </SvgText>
                      ))
                    : null}
                  {xAxisLabelPlan.map(({ index, xPixel, textAnchor }) => {
                    return (
                      <SvgText
                        key={String(xCategories[index])}
                        x={xPixel}
                        y={plotHeight + 16}
                        fontSize={tickLabelSizePx}
                        fontFamily={CHART_FONT_FAMILY}
                        fill={axisLabelColor}
                        textAnchor={textAnchor}
                      >
                        {xAxisFormatter(xCategories[index])}
                      </SvgText>
                    )
                  })}
                </G>

                <G accessible={false}>
                  {referenceLines.map((line, index) => {
                    const lineY = yPixelForValue(line.value, primaryScale)
                    const lineColor = line.color ?? resolveThemeColor(theme, 'colorDim')
                    return (
                      <G key={`${line.value}-${index}`}>
                        <Line
                          x1={0}
                          y1={lineY}
                          x2={plotWidth}
                          y2={lineY}
                          stroke={lineColor}
                          strokeWidth={1}
                        />
                        {line.label ? (
                          <SvgText
                            x={plotWidth}
                            y={lineY - 4}
                            fontSize={referenceLabelSizePx}
                            fontFamily={CHART_FONT_FAMILY}
                            fill={lineColor}
                            textAnchor="end"
                          >
                            {line.label}
                          </SvgText>
                        ) : null}
                      </G>
                    )
                  })}
                </G>

                {resolvedSeriesList.map((seriesItem) => {
                  const scale =
                    seriesItem === secondarySeries && secondaryScale ? secondaryScale : primaryScale
                  const pixelPoints: PixelPoint[] = seriesItem.points.map((point, index) => ({
                    x: xPixelForIndex(index),
                    y: isValidY(point.y) ? yPixelForValue(point.y, scale) : null,
                  }))
                  const runs = buildRuns(pixelPoints, connectNulls)
                  const validPointCount = pixelPoints.filter((point) => point.y !== null).length
                  const showSeriesDots = resolveShowDotsForSeries(showDots, validPointCount)

                  return (
                    <G key={seriesItem.key}>
                      {showArea
                        ? runs.map((run, runIndex) => {
                            const areaPath = buildAreaPath(run, type, plotHeight)
                            return areaPath ? (
                              <Path
                                key={runIndex}
                                d={areaPath}
                                fill={`url(#${gradientIdPrefix}-${seriesItem.key})`}
                                fillOpacity={areaOpacity}
                                accessible={false}
                              />
                            ) : null
                          })
                        : null}
                      {runs.map((run, runIndex) => {
                        const linePath = buildPath(run, type)
                        return linePath ? (
                          <Path
                            key={runIndex}
                            d={linePath}
                            stroke={seriesItem.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={seriesItem.strokeDasharray}
                            fill="none"
                            accessible={false}
                          />
                        ) : null
                      })}
                      {showSeriesDots
                        ? seriesItem.points.map((point, index) => {
                            const pixel = pixelPoints[index]
                            if (pixel.y === null) return null
                            return (
                              <G key={String(point.x)}>
                                {onPointPress ? (
                                  <Circle
                                    cx={pixel.x}
                                    cy={pixel.y}
                                    r={DOT_TOUCH_TARGET_RADIUS_PX}
                                    fill={seriesItem.color}
                                    fillOpacity={0}
                                    onPress={() => onPointPress(point, seriesItem.key)}
                                  />
                                ) : null}
                                <Circle
                                  cx={pixel.x}
                                  cy={pixel.y}
                                  r={DOT_RADIUS_PX}
                                  fill={seriesItem.color}
                                  accessible={false}
                                />
                              </G>
                            )
                          })
                        : null}
                    </G>
                  )
                })}
              </G>
            )}

            {xAxisLabel ? (
              <SvgText
                x={resolvedPadding.left + plotWidth / 2}
                y={height - 6}
                fontSize={axisTitleSizePx}
                fontFamily={CHART_FONT_FAMILY}
                fill={axisLabelColor}
                textAnchor="middle"
                accessible={false}
              >
                {xAxisLabel}
              </SvgText>
            ) : null}
            {yAxisLabel ? (
              <SvgText
                x={12}
                y={resolvedPadding.top + plotHeight / 2}
                fontSize={axisTitleSizePx}
                fontFamily={CHART_FONT_FAMILY}
                fill={axisLabelColor}
                textAnchor="middle"
                rotation={-90}
                origin={`12, ${resolvedPadding.top + plotHeight / 2}`}
                accessible={false}
              >
                {yAxisLabel}
              </SvgText>
            ) : null}
          </Svg>
          {!isEmpty && hoveredIndex !== null && tooltipRows.length > 0 ? (
            <ChartTooltip
              header={xAxisFormatter(xCategories[hoveredIndex])}
              rows={tooltipRows}
              left={tooltipLeftPx}
              top={resolvedPadding.top}
            />
          ) : null}
        </LineAreaPlotArea>
      </LineAreaScrollContainer>
      {resolvedSeriesList.length > 1 && !isEmpty ? (
        <YStack marginTop={chartToLegendGapPx} width="100%">
          <LineAreaLegend seriesList={resolvedSeriesList} legendLabelSizePx={legendLabelSizePx} />
        </YStack>
      ) : null}
    </LineAreaFrame>
  )
}

export function LineAreaChart({ variant = 'bare', ...contentProps }: LineAreaChartProps) {
  if (variant === 'card') {
    // width + alignSelf override Card's parent's alignItems:"center", which otherwise
    // lets Card shrink-wrap to LineAreaChartContent's own (possibly very wide, fixed-px)
    // intrinsic width instead of being bound by the actual host container.
    return (
      <Card alignItems="center" alignSelf="stretch" width="100%" padding={CARD_PADDING_PX}>
        <LineAreaChartContent {...contentProps} />
      </Card>
    )
  }
  return <LineAreaChartContent {...contentProps} />
}
