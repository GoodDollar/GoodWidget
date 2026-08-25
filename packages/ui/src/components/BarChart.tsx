/**
 * BarChart — discrete categorical comparison via proportional bar length,
 * vertical or horizontal. Third of 5 planned analytics chart components
 * (Scorecard and PieDonutChart shipped first, in PR #142).
 *
 * Follows Scorecard.tsx's structural patterns (createComponent, useTheme,
 * formatMetricValue, golden-ratio spacing) and PieDonutChart.tsx's SVG/theme
 * conventions (resolveThemeColor, accessible={false} on data shapes with a
 * single descriptive label on the root Svg).
 */
import React, { useState } from 'react'
import Svg, { G, Line, Path, Text as SvgText } from 'react-native-svg'
import { Text as TamaguiText, useTheme, YStack } from 'tamagui'
import { createComponent } from '../createComponent'
import { Card } from './Card'
import { ChartTooltip, estimateChartTooltipWidthPx, type ChartTooltipRow } from './ChartTooltip'
import { CHART_FONT_FAMILY } from '../utils/chartFontFamily'
import { type ChartValueType, formatByValueType } from '../utils/formatMetricValue'
import { resolveThemeColor } from '../utils/resolveThemeColor'
import {
  computeChartScaleRatio,
  computeShrinkToFitFontSizePx,
  scaleEdgeInsets,
  scalePx,
} from '../utils/chartResponsiveScale'
import { estimateTextWidthPx, truncateLabelToWidth } from '../utils/textWidthEstimate'
import { computeXAxisLabelPlan } from '../utils/xAxisLabelPlan'
import { useMeasuredWidth } from '../hooks/useMeasuredWidth'

export type BarChartVariant = 'bare' | 'card'
export type BarChartLayout = 'vertical' | 'horizontal'

export interface BarChartDataItem {
  category: string
  value: number
}

export interface BarChartPadding {
  top: number
  right: number
  bottom: number
  left: number
}

export interface BarChartProps {
  data: BarChartDataItem[]
  title?: string
  layout?: BarChartLayout
  showGrid?: boolean
  showValueLabels?: boolean
  valueFormatter?: (value: number) => string
  /**
   * The bar values' declared semantic type — drives decimal precision for
   * both axis ticks and the hover tooltip from one shared config instead of
   * each guessing from a value's runtime shape. Ignored when
   * `valueFormatter` is explicitly provided. Defaults to `'auto'` (today's
   * default chart formatting).
   */
  valueType?: ChartValueType
  /** Precision override for `valueType: 'decimal'` (default 2). Ignored by `'integer'`/`'currency'`, which are fixed. */
  valueDecimals?: number
  xAxisLabel?: string
  yAxisLabel?: string
  barCornerRadius?: number
  onBarPress?: (item: BarChartDataItem, index: number) => void
  variant?: BarChartVariant
  testID?: string
  accessibilityLabel?: string
  width?: number | string
  height?: number
  padding?: Partial<BarChartPadding>
}

/**
 * Golden-ratio scale/spacing constants, matching Scorecard.tsx's values so
 * all analytics components breathe identically. Scorecard's own constants
 * are private (not exported) and out of this task's scope to modify, so
 * these are re-declared locally, mirroring PieDonutChart's precedent.
 *
 * These are *base* sizes tuned for a chart rendered at REFERENCE_WIDTH_PX —
 * BarChartContent scales them by the chart's actual measured width (see
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
const VALUE_LABEL_BASE_SIZE_PX = CHART_BASE_SIZE_PX / GOLDEN_RATIO ** 2

const TITLE_TO_CHART_GAP_BASE_PX = CHART_BASE_SIZE_PX / GOLDEN_RATIO
const CARD_PADDING_PX = CHART_BASE_SIZE_PX

const DEFAULT_PADDING: BarChartPadding = { top: 16, right: 16, bottom: 40, left: 48 }
/** Reference width both the base sizes above and DEFAULT_PADDING were tuned against.
 * Also the fallback viewBox width used for the single frame before a responsive
 * (string `width`) chart's first real layout measurement arrives. */
const REFERENCE_WIDTH_PX = 400

const DESIRED_TICK_COUNT = 5
/** "Nice" axis step multiples per spec — 1/2/5/10 at any power-of-ten magnitude
 * (20, 50, 100, 1K, ... are just 2/5/10 one magnitude up). */
const NICE_STEP_MULTIPLES = [1, 2, 5, 10] as const

/** Hides a value label once its bar shrinks below this length — an unlabeled sliver reads better than overlapping text. */
const MIN_BAR_LENGTH_FOR_VALUE_LABEL_PX = 20
const VALUE_LABEL_GAP_PX = 4
const BAR_FILL_FRACTION = 0.7
/** Grid lines need enough contrast to be useful without competing with the bars. */
const GRID_LINE_OPACITY = 0.22
const GRID_ZERO_LINE_OPACITY = 0.48
const GRID_LINE_WIDTH_PX = 1
const GRID_ZERO_LINE_WIDTH_PX = 1.25

/** Gap between adjacent category labels so wide labels never touch (mirrors LineAreaChart's X_LABEL_GAP_PX). */
const CATEGORY_LABEL_GAP_PX = 8
/** Gap kept between an axis line and the label sitting next to it — shared by
 * the primary y-tick offset and the y-axis title's placement below (mirrors
 * LineAreaChart's AXIS_LABEL_GAP_PX). */
const AXIS_LABEL_GAP_PX = 8

interface BarChartItem {
  category: string
  value: number
}

interface AxisScale {
  min: number
  max: number
  step: number
  ticks: number[]
}

/** Rounds a rough step up to the nearest 1/2/5/10 * 10^k so tick intervals read as round numbers. */
function computeNiceStep(roughStep: number): number {
  if (roughStep <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const normalized = roughStep / magnitude
  const niceMultiple = NICE_STEP_MULTIPLES.find((multiple) => multiple >= normalized) ?? 10
  return niceMultiple * magnitude
}

/**
 * Zero-inclusive axis scale (behavioral rule 1): positive-only data starts at
 * 0, data with negatives extends the axis below 0. Max/min are both snapped
 * to the nice step so ticks land on round numbers (rule 2).
 */
function computeNiceAxisScale(values: number[]): AxisScale {
  const maxValue = Math.max(0, ...values)
  const minValue = Math.min(0, ...values)
  const paddedMax = maxValue * 1.1
  const paddedMin = minValue * 1.1
  const step = computeNiceStep((paddedMax - paddedMin) / (DESIRED_TICK_COUNT - 1) || 1)

  const max = Math.ceil((paddedMax || step) / step) * step
  const min = minValue < 0 ? Math.floor(paddedMin / step) * step : 0

  const ticks: number[] = []
  for (let tick = min; tick <= max + step / 2; tick += step) {
    ticks.push(Math.round(tick / step) * step)
  }

  return { min, max, step, ticks }
}

/** Filters NaN/Infinity/null values silently (rule 10) — invalid items are dropped, not rendered as zero. */
function filterValidItems(data: BarChartDataItem[]): BarChartItem[] {
  return data.filter((item): item is BarChartItem => Number.isFinite(item.value))
}

/**
 * Degradation strategy for category-axis crowding (this is the fix item #3 QA
 * flagged as missing): at low category counts every label renders in full via
 * truncateLabelToWidth above. As category count grows, per-category slot size
 * shrinks toward (and past) sub-pixel, so truncation alone converges every
 * label to an unreadable "" rather than a legible chart. Instead of rendering
 * hundreds of empty labels, thin them adaptively — show only every Nth
 * category's label, spaced widely enough for the widest real label in the
 * dataset to fit without collision (mirrors LineAreaChart's
 * computeLabelSkipFactor, which solves the identical x-axis crowding problem).
 *
 * Bars themselves are deliberately NOT thinned or aggregated at any category
 * count: each bar is one real data point, and dropping/merging bars would
 * silently misrepresent the data the chart exists to show. Only the label
 * layer degrades; at extreme counts (e.g. 1000 categories) bars render as a
 * dense but honest visual field with sparse, readable axis labels.
 */
function computeLabelSkipFactor(
  categoryCount: number,
  availableSizePx: number,
  labelSlotSizePx: number,
): number {
  if (categoryCount <= 1) return 1
  const maxLabels = Math.max(1, Math.floor(availableSizePx / labelSlotSizePx))
  return Math.max(1, Math.ceil(categoryCount / maxLabels))
}

type RoundedEdge = 'top' | 'bottom' | 'right' | 'left'

/**
 * Path for a bar rect rounded only on its "outer" edge — the end farthest
 * from the zero baseline (top for upward bars, bottom for downward/negative
 * bars, right/left for horizontal bars). A plain <Rect rx> rounds all four
 * corners, which reads wrong where a bar meets its baseline.
 */
function buildBarPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  roundedEdge: RoundedEdge,
): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))

  if (r <= 0) {
    return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`
  }

  switch (roundedEdge) {
    case 'top':
      return `M ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} L ${x + width - r} ${y} A ${r} ${r} 0 0 1 ${x + width} ${y + r} L ${x + width} ${y + height} L ${x} ${y + height} Z`
    case 'bottom':
      return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height - r} A ${r} ${r} 0 0 1 ${x + width - r} ${y + height} L ${x + r} ${y + height} A ${r} ${r} 0 0 1 ${x} ${y + height - r} Z`
    case 'right':
      return `M ${x} ${y} L ${x + width - r} ${y} A ${r} ${r} 0 0 1 ${x + width} ${y + r} L ${x + width} ${y + height - r} A ${r} ${r} 0 0 1 ${x + width - r} ${y + height} L ${x} ${y + height} Z`
    case 'left':
      return `M ${x + r} ${y} A ${r} ${r} 0 0 0 ${x} ${y + r} L ${x} ${y + height - r} A ${r} ${r} 0 0 0 ${x + r} ${y + height} L ${x + width} ${y + height} L ${x + width} ${y} Z`
  }
}

const BarChartFrame = createComponent(YStack, {
  name: 'BarChart',
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
 * SVG can't reflow or shrink without becoming illegible — this scrolls it
 * horizontally instead of relying on an ancestor to clip it, mirroring
 * DataTable's own DataTableScrollContainer for the same wide-content case.
 */
const BarChartScrollContainer = createComponent(YStack, {
  name: 'BarChartScrollContainer',
  width: '100%',
  // Same shrink-wrap issue as BarChartFrame above: without this, this container
  // grows to match the SVG's own width instead of being clamped by BarChartFrame,
  // which silently defeats overflow:"auto" (nothing is left to scroll within).
  alignSelf: 'stretch',
  overflow: 'auto' as const,
})

/**
 * Positions the hover tooltip over the plot — deliberately not given a
 * `width`/`alignSelf: 'stretch'` (unlike BarChartScrollContainer above), so it
 * shrink-wraps to the SVG's own rendered size and doesn't disturb the wide
 * fixed-width chart's horizontal-scroll behavior.
 */
const BarChartPlotArea = createComponent(YStack, {
  name: 'BarChartPlotArea',
  position: 'relative',
})

const BarChartTitleText = createComponent(TamaguiText, {
  name: 'BarChartTitleText',
  fontFamily: '$body',
  fontWeight: '700',
  color: '$color',
  fontSize: TITLE_BASE_SIZE_PX,
  textAlign: 'center',
  marginBottom: TITLE_TO_CHART_GAP_BASE_PX,
})

/** Scales DEFAULT_PADDING to the chart's actual size, then layers an explicit
 * per-instance `padding` override on top unscaled — an override is the caller
 * opting out of the default for that edge, not a value we should re-scale. */
function mergePadding(
  padding: Partial<BarChartPadding> | undefined,
  scaleRatio: number,
  minLeftPx: number,
): BarChartPadding {
  const scaledDefaults = scaleEdgeInsets(DEFAULT_PADDING, scaleRatio)
  return { ...scaledDefaults, left: Math.max(scaledDefaults.left, minLeftPx), ...padding }
}

function BarChartContent({
  data,
  title,
  layout = 'vertical',
  showGrid = true,
  showValueLabels = false,
  valueFormatter: valueFormatterProp,
  valueType = 'auto',
  valueDecimals,
  xAxisLabel,
  yAxisLabel,
  barCornerRadius = 0,
  onBarPress,
  testID,
  accessibilityLabel,
  width = '100%',
  height = 200,
  padding,
}: Omit<BarChartProps, 'variant'>) {
  const theme = useTheme()
  const barColor = resolveThemeColor(theme, 'primary')
  const gridColor = resolveThemeColor(theme, 'colorDim')
  const axisLabelColor = resolveThemeColor(theme, 'placeholderColor')
  const textColor = resolveThemeColor(theme, 'color')
  // An explicit formatter always wins; otherwise the chart's declared
  // valueType picks precision, so ticks, bar-top labels, and the hover
  // tooltip below all read from this single resolved formatter.
  const valueFormatter = valueFormatterProp ?? ((value: number) => formatByValueType(value, valueType, valueDecimals))

  // QA fix: hovering a bar previously showed nothing. Tracks which item
  // index the pointer is currently over, or null when not hovering.
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const items = filterValidItems(data)
  const isEmpty = items.length === 0

  // A string `width` (e.g. the default "100%") only tells the SVG element itself how
  // to stretch — it carries no pixel value we can lay bars out against, so that case
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
  const axisTitleSizePx = clampFontSize(scalePx(AXIS_TITLE_BASE_SIZE_PX, scaleRatio))
  const tickLabelSizePx = clampFontSize(scalePx(TICK_LABEL_BASE_SIZE_PX, scaleRatio))
  const valueLabelSizePx = clampFontSize(scalePx(VALUE_LABEL_BASE_SIZE_PX, scaleRatio))

  const scale = computeNiceAxisScale(items.map((item) => item.value))
  const valueRange = scale.max - scale.min || 1
  const isVertical = layout === 'vertical'

  // Only the vertical layout puts numeric value-tick labels (and, when set, the
  // yAxisLabel title) in the left gutter — horizontal layout puts category
  // labels there instead, a separate concern callers already size via an
  // explicit `padding.left` override. The left gutter must fit the widest
  // actually-formatted tick label (measured, not guessed) plus, when a title
  // is present, that title's own rotated footprint, so a wide tick value
  // (e.g. "500.0K") can never collide with the title regardless of how far it
  // reaches leftward. DEFAULT_PADDING.left is only a floor; real content can
  // widen it further.
  const widestYTickLabelWidthPx = scale.ticks.reduce<number>(
    (widest, tick) => Math.max(widest, estimateTextWidthPx(valueFormatter(tick), tickLabelSizePx)),
    0,
  )
  const requiredLeftGutterPx = isVertical
    ? AXIS_LABEL_GAP_PX +
      widestYTickLabelWidthPx +
      AXIS_LABEL_GAP_PX +
      (yAxisLabel ? tickLabelSizePx + AXIS_LABEL_GAP_PX : 0)
    : 0

  const resolvedPadding = mergePadding(padding, scaleRatio, requiredLeftGutterPx)
  const plotWidth = viewBoxWidth - resolvedPadding.left - resolvedPadding.right
  const plotHeight = height - resolvedPadding.top - resolvedPadding.bottom

  const yAxisTitleXPx = Math.max(
    tickLabelSizePx / 2,
    resolvedPadding.left - AXIS_LABEL_GAP_PX - widestYTickLabelWidthPx - AXIS_LABEL_GAP_PX - tickLabelSizePx / 2,
  )

  const resolvedAccessibilityLabel =
    accessibilityLabel ??
    `${title ?? 'Bar chart'}, ${items.length} ${items.length === 1 ? 'category' : 'categories'}`

  // Position along the value axis for a given raw value, within the plot rect.
  const valueToPixel = (value: number, axisLengthPx: number): number =>
    ((value - scale.min) / valueRange) * axisLengthPx

  const slotSize = (isVertical ? plotWidth : plotHeight) / Math.max(items.length, 1)
  const barThickness = slotSize * BAR_FILL_FRACTION

  // Zero baseline position within the plot rect, in each layout's value-axis direction.
  const zeroOffset = valueToPixel(0, isVertical ? plotHeight : plotWidth)

  // Vertical layout's category axis stacks labels side by side (crowding is a
  // *width* problem), the same shape as LineAreaChart's x-axis, so it shares
  // that shared deterministic, collision-free placement algorithm. Horizontal
  // layout stacks labels top to bottom instead, one per row inside a
  // fixed-width left column, so it's a *height* problem instead and keeps the
  // simpler adaptive-thinning approach (out of scope for this fix).
  // No fixed-pixel floor here either — see LineAreaChart's matching comment.
  const widestCategoryLabelWidthPx = items.reduce<number>(
    (widest, item) => Math.max(widest, estimateTextWidthPx(item.category, tickLabelSizePx)),
    0,
  )
  const verticalCategoryLabelPlan = isVertical
    ? computeXAxisLabelPlan({
        categoryCount: items.length,
        xPixelForIndex: (index) => index * slotSize + slotSize / 2,
        labelWidthPx: widestCategoryLabelWidthPx,
      })
    : []
  const shownVerticalCategoryLabelIndexes = new Set(verticalCategoryLabelPlan.map((entry) => entry.index))
  const verticalCategoryLabelTextAnchorByIndex = new Map(
    verticalCategoryLabelPlan.map((entry) => [entry.index, entry.textAnchor]),
  )
  const categoryLabelSkipFactor = computeLabelSkipFactor(
    items.length,
    plotHeight,
    tickLabelSizePx + CATEGORY_LABEL_GAP_PX,
  )

  // Maps a pointer position to the item whose slot it falls in — a discrete
  // per-bar hit test, unlike LineAreaChart's continuous nearest-index lookup,
  // since bars (unlike points on a line) occupy a real width to hit-test against.
  const handlePlotPointerMove = (event: {
    clientX: number
    clientY: number
    currentTarget: { getBoundingClientRect?: () => DOMRect }
  }) => {
    if (isEmpty) return
    const rect = event.currentTarget.getBoundingClientRect?.()
    if (!rect) return
    const pointerX = event.clientX - rect.left
    const pointerY = event.clientY - rect.top
    const axisPositionPx = isVertical
      ? pointerX - resolvedPadding.left
      : pointerY - resolvedPadding.top
    const axisLengthPx = isVertical ? plotWidth : plotHeight
    if (axisPositionPx < 0 || axisPositionPx > axisLengthPx) {
      setHoveredIndex(null)
      return
    }
    setHoveredIndex(Math.min(items.length - 1, Math.max(0, Math.floor(axisPositionPx / slotSize))))
  }

  const handlePlotPointerLeave = () => setHoveredIndex(null)

  const hoveredItem = hoveredIndex !== null ? items[hoveredIndex] : null
  const tooltipRows: ChartTooltipRow[] = hoveredItem
    ? [{ color: barColor, label: title ?? 'Value', value: valueFormatter(hoveredItem.value) }]
    : []

  // Follows the cursor along the axis bars are laid out on (horizontally for
  // vertical bars, at a fixed left offset otherwise), clamped so the
  // tooltip never overhangs the chart frame. Width is estimated from this
  // hover's actual header/rows so the clamp matches what ChartTooltip itself
  // will render at, rather than a fixed guess.
  const tooltipWidthPx = hoveredItem
    ? estimateChartTooltipWidthPx(hoveredItem.category, tooltipRows, viewBoxWidth)
    : 0
  const maxTooltipLeftPx = Math.max(0, viewBoxWidth - tooltipWidthPx)
  const hoveredSlotCenterPx =
    hoveredIndex !== null ? resolvedPadding.left + hoveredIndex * slotSize + slotSize / 2 : 0
  const tooltipLeftPx = isVertical
    ? Math.min(maxTooltipLeftPx, Math.max(0, hoveredSlotCenterPx - tooltipWidthPx / 2))
    : Math.min(maxTooltipLeftPx, resolvedPadding.left)

  return (
    <BarChartFrame
      testID={testID}
      data-testid={testID}
      width={isResponsiveWidth ? '100%' : undefined}
      onLayout={onLayout}
    >
      {title ? (
        <BarChartTitleText fontSize={fittedTitleSizePx} marginBottom={titleToChartGapPx}>
          {title}
        </BarChartTitleText>
      ) : null}
      <BarChartScrollContainer>
        <BarChartPlotArea onMouseMove={handlePlotPointerMove} onMouseLeave={handlePlotPointerLeave}>
          <Svg
            width={width}
            height={height}
            viewBox={`0 0 ${viewBoxWidth} ${height}`}
            preserveAspectRatio="none"
            accessibilityRole="image"
            aria-label={resolvedAccessibilityLabel}
          >
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
              <>
                {showGrid ? (
                  <G accessible={false}>
                    {scale.ticks.map((tick) => {
                      const tickOffset = valueToPixel(tick, isVertical ? plotHeight : plotWidth)
                      const isZeroTick = tick === 0

                      return isVertical ? (
                        <Line
                          key={tick}
                          x1={resolvedPadding.left}
                          y1={resolvedPadding.top + plotHeight - tickOffset}
                          x2={resolvedPadding.left + plotWidth}
                          y2={resolvedPadding.top + plotHeight - tickOffset}
                          stroke={gridColor}
                          strokeOpacity={isZeroTick ? GRID_ZERO_LINE_OPACITY : GRID_LINE_OPACITY}
                          strokeWidth={isZeroTick ? GRID_ZERO_LINE_WIDTH_PX : GRID_LINE_WIDTH_PX}
                        />
                      ) : (
                        <Line
                          key={tick}
                          x1={resolvedPadding.left + tickOffset}
                          y1={resolvedPadding.top}
                          x2={resolvedPadding.left + tickOffset}
                          y2={resolvedPadding.top + plotHeight}
                          stroke={gridColor}
                          strokeOpacity={isZeroTick ? GRID_ZERO_LINE_OPACITY : GRID_LINE_OPACITY}
                          strokeWidth={isZeroTick ? GRID_ZERO_LINE_WIDTH_PX : GRID_LINE_WIDTH_PX}
                        />
                      )
                    })}
                  </G>
                ) : null}

                <G accessible={false}>
                  {scale.ticks.map((tick) => {
                    const tickOffset = valueToPixel(tick, isVertical ? plotHeight : plotWidth)
                    const formattedTick = valueFormatter(tick)

                    return isVertical ? (
                      <SvgText
                        key={tick}
                        x={resolvedPadding.left - AXIS_LABEL_GAP_PX}
                        y={resolvedPadding.top + plotHeight - tickOffset}
                        fontSize={tickLabelSizePx}
                        fontFamily={CHART_FONT_FAMILY}
                        fill={axisLabelColor}
                        textAnchor="end"
                        alignmentBaseline="middle"
                      >
                        {formattedTick}
                      </SvgText>
                    ) : (
                      <SvgText
                        key={tick}
                        x={resolvedPadding.left + tickOffset}
                        y={resolvedPadding.top + plotHeight + 16}
                        fontSize={tickLabelSizePx}
                        fontFamily={CHART_FONT_FAMILY}
                        fill={axisLabelColor}
                        textAnchor="middle"
                      >
                        {formattedTick}
                      </SvgText>
                    )
                  })}
                </G>

                {items.map((item, index) => {
                  const barLength =
                    valueToPixel(item.value, isVertical ? plotHeight : plotWidth) - zeroOffset
                  const isPositive = item.value >= 0

                  if (isVertical) {
                    const slotStart = resolvedPadding.left + index * slotSize
                    const barX = slotStart + (slotSize - barThickness) / 2
                    const baselineY = resolvedPadding.top + plotHeight - zeroOffset
                    const barY = isPositive ? baselineY - barLength : baselineY
                    const barHeight = Math.abs(barLength)
                    // The shared label plan already guarantees this label's full width fits
                    // without colliding with a neighbor or spilling into the Y-axis tick area,
                    // so no truncation or ad-hoc edge clamping is needed here.
                    const showCategoryLabel = shownVerticalCategoryLabelIndexes.has(index)
                    const categoryLabel = showCategoryLabel ? item.category : ''
                    const categoryLabelTextAnchor =
                      verticalCategoryLabelTextAnchorByIndex.get(index) ?? 'middle'
                    const categoryLabelX = slotStart + slotSize / 2

                    return (
                      <G key={`${item.category}-${index}`}>
                        <Path
                          d={buildBarPath(
                            barX,
                            barY,
                            barThickness,
                            barHeight,
                            barCornerRadius,
                            isPositive ? 'top' : 'bottom',
                          )}
                          fill={barColor}
                          accessible={false}
                          onPress={onBarPress ? () => onBarPress(item, index) : undefined}
                        />
                        {showCategoryLabel ? (
                          <SvgText
                            x={categoryLabelX}
                            y={resolvedPadding.top + plotHeight + 16}
                            fontSize={tickLabelSizePx}
                            fontFamily={CHART_FONT_FAMILY}
                            fill={axisLabelColor}
                            textAnchor={categoryLabelTextAnchor}
                            accessible={false}
                          >
                            {categoryLabel}
                          </SvgText>
                        ) : null}
                        {showValueLabels && barHeight >= MIN_BAR_LENGTH_FOR_VALUE_LABEL_PX ? (
                          <SvgText
                            x={slotStart + slotSize / 2}
                            y={
                              isPositive
                                ? barY - VALUE_LABEL_GAP_PX
                                : barY + barHeight + VALUE_LABEL_GAP_PX + valueLabelSizePx
                            }
                            fontSize={valueLabelSizePx}
                            fontFamily={CHART_FONT_FAMILY}
                            fill={textColor}
                            textAnchor="middle"
                            accessible={false}
                          >
                            {valueFormatter(item.value)}
                          </SvgText>
                        ) : null}
                      </G>
                    )
                  }

                  const slotStart = resolvedPadding.top + index * slotSize
                  const barY = slotStart + (slotSize - barThickness) / 2
                  const baselineX = resolvedPadding.left + zeroOffset
                  const barX = isPositive ? baselineX : baselineX - Math.abs(barLength)
                  const barWidth = Math.abs(barLength)
                  const categoryLabelMaxWidth = resolvedPadding.left - 12
                  const showCategoryLabel = index % categoryLabelSkipFactor === 0
                  const categoryLabel = showCategoryLabel
                    ? truncateLabelToWidth(item.category, categoryLabelMaxWidth, tickLabelSizePx)
                    : ''

                  return (
                    <G key={`${item.category}-${index}`}>
                      <Path
                        d={buildBarPath(
                          barX,
                          barY,
                          barWidth,
                          barThickness,
                          barCornerRadius,
                          isPositive ? 'right' : 'left',
                        )}
                        fill={barColor}
                        accessible={false}
                        onPress={onBarPress ? () => onBarPress(item, index) : undefined}
                      />
                      {showCategoryLabel ? (
                        <SvgText
                          x={resolvedPadding.left - 8}
                          y={slotStart + slotSize / 2}
                          fontSize={tickLabelSizePx}
                          fontFamily={CHART_FONT_FAMILY}
                          fill={axisLabelColor}
                          textAnchor="end"
                          alignmentBaseline="middle"
                          accessible={false}
                        >
                          {categoryLabel}
                        </SvgText>
                      ) : null}
                      {showValueLabels && barWidth >= MIN_BAR_LENGTH_FOR_VALUE_LABEL_PX ? (
                        <SvgText
                          x={
                            isPositive
                              ? barX + barWidth + VALUE_LABEL_GAP_PX
                              : barX - VALUE_LABEL_GAP_PX
                          }
                          y={slotStart + slotSize / 2}
                          fontSize={valueLabelSizePx}
                          fontFamily={CHART_FONT_FAMILY}
                          fill={textColor}
                          textAnchor={isPositive ? 'start' : 'end'}
                          alignmentBaseline="middle"
                          accessible={false}
                        >
                          {valueFormatter(item.value)}
                        </SvgText>
                      ) : null}
                    </G>
                  )
                })}
              </>
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
              // Caption-tier size (matches Text variant="caption"'s $placeholderColor/$1
              // pairing): the rotated title shares the reserved left-gutter with the tick
              // labels, so it must share their size tier rather than the roomier
              // axis-title tier the x-axis title uses below the unconstrained plot.
              // x is derived from the actual widest tick label (yAxisTitleXPx above), not
              // a fixed offset, so the title clears real tick content of any width.
              <SvgText
                x={yAxisTitleXPx}
                y={resolvedPadding.top + plotHeight / 2}
                fontSize={tickLabelSizePx}
                fontFamily={CHART_FONT_FAMILY}
                fill={axisLabelColor}
                textAnchor="middle"
                rotation={-90}
                origin={`${yAxisTitleXPx}, ${resolvedPadding.top + plotHeight / 2}`}
                accessible={false}
              >
                {yAxisLabel}
              </SvgText>
            ) : null}
          </Svg>
          {!isEmpty && hoveredItem ? (
            <ChartTooltip
              header={hoveredItem.category}
              rows={tooltipRows}
              left={tooltipLeftPx}
              top={resolvedPadding.top}
              chartWidthPx={viewBoxWidth}
            />
          ) : null}
        </BarChartPlotArea>
      </BarChartScrollContainer>
    </BarChartFrame>
  )
}

export function BarChart({ variant = 'bare', ...contentProps }: BarChartProps) {
  if (variant === 'card') {
    // width + alignSelf override Card's parent's alignItems:"center", which otherwise
    // lets Card shrink-wrap to BarChartContent's own (possibly very wide, fixed-px)
    // intrinsic width instead of being bound by the actual host container.
    return (
      <Card alignItems="center" alignSelf="stretch" width="100%" padding={CARD_PADDING_PX}>
        <BarChartContent {...contentProps} />
      </Card>
    )
  }

  return <BarChartContent {...contentProps} />
}
