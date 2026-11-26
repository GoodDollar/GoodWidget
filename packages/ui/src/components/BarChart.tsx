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
import { Text as TamaguiText, useTheme, XStack, YStack } from 'tamagui'
import { createComponent } from '../createComponent'
import { Card } from './Card'
import {
  ChartTooltip,
  estimateChartTooltipWidthPx,
  SQUARE_SWATCH_CORNER_RATIO,
  type ChartSwatchShape,
  type ChartTooltipRow,
} from './ChartTooltip'
import { CHART_FONT_FAMILY } from '../utils/chartFontFamily'
import { type ChartValueType, formatByValueType } from '../utils/formatMetricValue'
import { resolveThemeColor } from '../utils/resolveThemeColor'
import {
  computeChartScaleRatio,
  computeShrinkToFitFontSizePx,
  scaleEdgeInsets,
  scalePx,
} from '../utils/chartResponsiveScale'
import { estimateTextWidthPx, truncateLabelToWidth, wrapLabelToTwoLines } from '../utils/textWidthEstimate'
import { computeXAxisLabelPlan } from '../utils/xAxisLabelPlan'
import { useMeasuredWidth } from '../hooks/useMeasuredWidth'
import { useMeasuredHeight } from '../hooks/useMeasuredHeight'

export type BarChartVariant = 'bare' | 'card'
export type BarChartLayout = 'vertical' | 'horizontal'

/** One piece of a bar split into parts (e.g. received vs sent). */
export interface BarChartSegment {
  value: number
  label: string
  /** Omitted = the item's `color`, else the theme's primary color. */
  color?: string
}

export interface BarChartDataItem {
  category: string
  value: number
  /** This bar's fill (and its hover-row dot). Omitted = the theme's primary color. */
  color?: string
  /**
   * Draws the bar as pieces side by side along the value axis, each in its
   * own color, in the order given, with a thin gap (sized from the text)
   * between neighbouring pieces. `value` stays the bar's total: the value
   * label and the hover's "Total" row read it. Pieces are drawn as given, not
   * rescaled to `value` — if they don't add up to it, the drawn length shows
   * the pieces' sum while the label and hover total still read `value`.
   * Negative or non-finite pieces are dropped. The hover lists every piece,
   * then the total.
   */
  segments?: BarChartSegment[]
}

export interface BarChartPadding {
  top: number
  right: number
  bottom: number
  left: number
}

/** Hover-box-only settings. Omitted = the hover box keeps today's row name and the chart's own formatter. */
export interface BarChartTooltipOptions {
  /** Row name in the hover box (e.g. a metric's short name) without drawing a title in the chart. Default: `title`, else "Value". */
  label?: string
  /** Formats the value in the hover box only, e.g. the exact number while bars show a shortened one. Default: the chart's formatter. */
  valueFormatter?: (value: number) => string
  /** true = values in a right-aligned column, no colon, so numbers line up. Default false. */
  rightAlignValues?: boolean
}

/** One legend entry: a color swatch and its label. */
export interface BarChartLegendItem {
  label: string
  color: string
}

export interface BarChartProps {
  data: BarChartDataItem[]
  title?: string
  tooltip?: BarChartTooltipOptions
  /** A row of color swatches with labels above the bars (e.g. what each `segments` shade means).
   * Same look as LineAreaChart's legend. Omitted or empty = no legend. */
  legend?: BarChartLegendItem[]
  /** Shape of the color marks in the legend and the hover box. Default 'round'. */
  swatchShape?: ChartSwatchShape
  layout?: BarChartLayout
  /**
   * Horizontal layout only: each row reads name | bar | value, like a table.
   * Names sit left-aligned at the chart's left edge, in a column as wide as
   * the longest name (at most a third of the chart; longer names end in "…").
   * Values, when shown, sit right-aligned at the right edge in their own
   * column, on every bar. Both gutters size themselves, so no `padding` is
   * needed; with `height` left out, the chart is as tall as its rows, spaced
   * by the text size. With `showValueAxis={false}` the longest bar fills its
   * row. Ignored in vertical layout. Default false.
   */
  labelColumns?: boolean
  showGrid?: boolean
  /** false hides the value axis's number labels and, in vertical layout, the
   * left gutter they sat in (only a y-axis title keeps space there). Grid lines
   * follow `showGrid`. Default true. */
  showValueAxis?: boolean
  showValueLabels?: boolean
  /** Draws the value label on every bar, including bars too short for one by
   * default and zero-length ones (implies `showValueLabels`). Default false. */
  alwaysShowValueLabels?: boolean
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
  height?: number | string
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

/** Legend text mirrors LineAreaChart's legend text (its constants are private) —
 * see the reasoning next to them there. */
const LEGEND_SIZE_SCALE_FACTOR = 0.9
const LEGEND_LABEL_BASE_SIZE_PX = (CHART_BASE_SIZE_PX / GOLDEN_RATIO ** 2) * LEGEND_SIZE_SCALE_FACTOR
/** Legend swatch and spacing are multiples of the legend's own text size, so they
 * scale with the chart's width along with it. Proportions from the approved
 * dashboard preview (13 px legend text). */
/** Swatch = 0.9 x text (preview: 12 px). */
const LEGEND_SWATCH_TO_TEXT_RATIO = 0.9
/** Space between swatch and its label = 0.5 x text (preview: 6 px). */
const LEGEND_SWATCH_GAP_TO_TEXT_RATIO = 0.5
/** Space between legend items = 1.2 x text (preview: 16 px). */
const LEGEND_ITEM_GAP_TO_TEXT_RATIO = 1.2
/** Space between the legend and the bars = 0.8 x text (preview: 10 px). */
const LEGEND_TO_CHART_GAP_TO_TEXT_RATIO = 0.8

/** `labelColumns` rows, as multiples of the row text size where they are sizes.
 * Proportions from the approved dashboard preview (14 px row text). */
/** Name column is at most a third of the chart, so bars keep room on a phone (preview phone: 90 of ~270 px). */
const LABEL_COLUMN_MAX_WIDTH_SHARE = 1 / 3
/** Space between a column and the bars = 0.7 x text (preview: 10 px). */
const LABEL_COLUMN_GAP_TO_TEXT_RATIO = 0.7
/** Row to row = 1.9 x text when the chart sizes its own height (preview: ~26 px). With
 * BAR_FILL_FRACTION the bar is then ~1.3 x text thick (preview: 18 px). */
const LABEL_COLUMN_ROW_HEIGHT_TO_TEXT_RATIO = 1.9
/** Thin gap between a split bar's pieces = 0.15 x text, so neighbouring shades read as separate pieces
 * (preview: 2 px on 14 px text). Taken out of the earlier piece, so the bar's total length stays exact. */
const SEGMENT_GAP_TO_TEXT_RATIO = 0.15

const DEFAULT_PADDING: BarChartPadding = { top: 16, right: 16, bottom: 40, left: 48 }
/** Reference width both the base sizes above and DEFAULT_PADDING were tuned against.
 * Also the fallback viewBox width used for the single frame before a responsive
 * (string `width`) chart's first real layout measurement arrives. */
const REFERENCE_WIDTH_PX = 400
/** Mirrors REFERENCE_WIDTH_PX above for the vertical axis: the fallback viewBox
 * height used for a responsive (string `height`) chart before its first real
 * layout measurement arrives, and the visible height when no flex ancestor
 * offers any extra vertical room. */
const REFERENCE_HEIGHT_PX = 280

const DESIRED_TICK_COUNT = 5
/** "Nice" axis step multiples per spec — 1/2/5/10 at any power-of-ten magnitude
 * (20, 50, 100, 1K, ... are just 2/5/10 one magnitude up). */
const NICE_STEP_MULTIPLES = [1, 2, 5, 10] as const

/** Hides a value label once its bar shrinks below this length — an unlabeled sliver reads better than overlapping text.
 * `alwaysShowValueLabels` opts out, for charts where every value must be readable. */
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
  color?: string
  segments?: BarChartSegment[]
}

/** A segmented item's usable pieces: negative and non-finite values are dropped. */
function validSegments(segments: BarChartSegment[]): BarChartSegment[] {
  return segments.filter((segment) => Number.isFinite(segment.value) && segment.value >= 0)
}

/** How far a bar reaches along the value axis: its value, or the pieces' sum when that's larger (so pieces that
 * add up to more than `value` still fit inside the axis instead of overflowing the plot). */
function barExtentValue(item: BarChartItem): number {
  if (!item.segments) return item.value
  const piecesSum = validSegments(item.segments).reduce((sum, segment) => sum + segment.value, 0)
  return Math.max(item.value, piecesSum)
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

const BarChartLegendLabelText = createComponent(TamaguiText, {
  name: 'BarChartLegendLabelText',
  fontFamily: '$body',
  fontWeight: '400',
  color: '$color',
  fontSize: LEGEND_LABEL_BASE_SIZE_PX,
})

const BarChartLegendSwatch = createComponent(YStack, {
  name: 'BarChartLegendSwatch',
  borderRadius: '$full',
})

function BarChartLegend({
  items,
  labelSizePx,
  swatchShape,
}: {
  items: BarChartLegendItem[]
  labelSizePx: number
  swatchShape: ChartSwatchShape
}) {
  const swatchSizePx = labelSizePx * LEGEND_SWATCH_TO_TEXT_RATIO
  return (
    <XStack
      gap={labelSizePx * LEGEND_ITEM_GAP_TO_TEXT_RATIO}
      flexWrap="wrap"
      justifyContent="center"
      marginBottom={labelSizePx * LEGEND_TO_CHART_GAP_TO_TEXT_RATIO}
      data-testid="bar-chart-legend"
    >
      {items.map((item) => (
        <XStack key={item.label} alignItems="center" gap={labelSizePx * LEGEND_SWATCH_GAP_TO_TEXT_RATIO}>
          <BarChartLegendSwatch
            width={swatchSizePx}
            height={swatchSizePx}
            borderRadius={swatchShape === 'square' ? swatchSizePx * SQUARE_SWATCH_CORNER_RATIO : '$full'}
            backgroundColor={item.color}
            data-testid="bar-chart-legend-swatch"
          />
          <BarChartLegendLabelText fontSize={labelSizePx}>{item.label}</BarChartLegendLabelText>
        </XStack>
      ))}
    </XStack>
  )
}

/** Scales DEFAULT_PADDING to the chart's actual size, then layers an explicit
 * per-instance `padding` override on top unscaled — an override is the caller
 * opting out of the default for that edge, not a value we should re-scale. */
function mergePadding(
  padding: Partial<BarChartPadding> | undefined,
  scaleRatio: number,
  minLeftPx: number,
  layoutPadding?: Partial<BarChartPadding>,
): BarChartPadding {
  const scaledDefaults = scaleEdgeInsets(DEFAULT_PADDING, scaleRatio)
  return { ...scaledDefaults, left: Math.max(scaledDefaults.left, minLeftPx), ...layoutPadding, ...padding }
}

function BarChartContent({
  data,
  title,
  tooltip,
  legend,
  swatchShape = 'round',
  layout = 'vertical',
  labelColumns = false,
  showGrid = true,
  showValueAxis = true,
  showValueLabels = false,
  alwaysShowValueLabels = false,
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
  height: heightProp,
  padding,
}: Omit<BarChartProps, 'variant'>) {
  const height = heightProp ?? '100%'
  const isLabelColumns = labelColumns && layout === 'horizontal'
  // labelColumns with no `height`: the chart is as tall as its rows (sized below, from the text size).
  const isRowsHeight = isLabelColumns && heightProp === undefined
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

  // Mirrors the width handling above, but measured off BarChartPlotArea rather
  // than BarChartFrame: once flexGrow is applied below, PlotArea's own resolved
  // layout height genuinely reflects how much vertical room its ancestor chain
  // gave it. Measuring the Frame here instead would be circular, the same way
  // measuring PlotArea for *width* would be — PlotArea shrink-wraps horizontally
  // on purpose (see its definition above).
  const isResponsiveHeight = !isRowsHeight && typeof height !== 'number'
  const { measuredHeightPx, onLayout: onPlotAreaLayout } = useMeasuredHeight(REFERENCE_HEIGHT_PX)

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
  const legendLabelSizePx = clampFontSize(scalePx(LEGEND_LABEL_BASE_SIZE_PX, scaleRatio))

  // Widest category label, measured. Vertical layout feeds it to the label plan
  // below; labelColumns sizes its name column from it.
  const widestCategoryLabelWidthPx = items.reduce<number>(
    (widest, item) => Math.max(widest, estimateTextWidthPx(item.category, tickLabelSizePx)),
    0,
  )

  // labelColumns: name column (longest name, capped) on the left, value column
  // (widest shown value) on the right, each followed by a text-sized gap. With no
  // value axis or x-axis title, rows start and end at the chart's edges.
  const labelColumnGapPx = tickLabelSizePx * LABEL_COLUMN_GAP_TO_TEXT_RATIO
  const nameColumnWidthPx = isLabelColumns
    ? Math.min(widestCategoryLabelWidthPx, viewBoxWidth * LABEL_COLUMN_MAX_WIDTH_SHARE)
    : 0
  const showsValueLabels = showValueLabels || alwaysShowValueLabels
  const valueColumnWidthPx =
    isLabelColumns && showsValueLabels
      ? items.reduce<number>(
          (widest, item) => Math.max(widest, estimateTextWidthPx(valueFormatter(item.value), valueLabelSizePx)),
          0,
        )
      : 0
  const labelColumnsPadding: Partial<BarChartPadding> | undefined = isLabelColumns
    ? {
        left: nameColumnWidthPx + labelColumnGapPx,
        right: valueColumnWidthPx > 0 ? valueColumnWidthPx + labelColumnGapPx : 0,
        ...(!showValueAxis && !xAxisLabel ? { top: 0, bottom: 0 } : {}),
      }
    : undefined
  const rowsHeightPadding = { ...scaleEdgeInsets(DEFAULT_PADDING, scaleRatio), ...labelColumnsPadding, ...padding }
  // At least one row, so an empty chart keeps room for its "No data" message. Rounded up to whole
  // pixels: a fractional height gets snapped by the browser, which then derives the 100%-wide SVG's
  // width from that snapped height, a hair narrower each time, and the width measurement never settles.
  const rowsHeightPx = Math.ceil(
    Math.max(items.length, 1) * Math.max(tickLabelSizePx, valueLabelSizePx) * LABEL_COLUMN_ROW_HEIGHT_TO_TEXT_RATIO +
      rowsHeightPadding.top +
      rowsHeightPadding.bottom,
  )
  const viewBoxHeight = isRowsHeight ? rowsHeightPx : isResponsiveHeight ? measuredHeightPx : (height as number)

  // labelColumns without a value axis reads like a table: no tick numbers to keep round, so the
  // scale ends at the largest bar and that bar fills its row (grid lines past it are dropped).
  const niceScale = computeNiceAxisScale(items.map(barExtentValue))
  const largestExtent = Math.max(0, ...items.map(barExtentValue))
  const scale =
    isLabelColumns && !showValueAxis && largestExtent > 0
      ? { ...niceScale, max: largestExtent, ticks: niceScale.ticks.filter((tick) => tick <= largestExtent) }
      : niceScale
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
  const widestYTickLabelWidthPx = showValueAxis
    ? scale.ticks.reduce<number>(
        (widest, tick) => Math.max(widest, estimateTextWidthPx(valueFormatter(tick), tickLabelSizePx)),
        0,
      )
    : 0

  // Rotated axis titles read along the plot's *height*, not its width, so
  // whether one needs to wrap onto a second line depends on plotHeight — which
  // in turn only depends on top/bottom padding (left/right padding never
  // affects it). Resolving top/bottom padding once here, ahead of the left
  // gutter sizing below, lets the title's line count feed into the gutter's
  // width reservation without a circular dependency (mirrors LineAreaChart).
  // labelColumns resolves its own top/bottom gutters (above), so its title wraps against those.
  const topBottomPaddingPx = isLabelColumns ? rowsHeightPadding : scaleEdgeInsets(DEFAULT_PADDING, scaleRatio)
  const preliminaryPlotHeightPx = viewBoxHeight - topBottomPaddingPx.top - topBottomPaddingPx.bottom
  const axisTitleAvailableLengthPx = Math.max(0, preliminaryPlotHeightPx - AXIS_LABEL_GAP_PX * 2)
  // Wrap to two lines at a word boundary first; only the last-resort ellipsis
  // (inside wrapLabelToTwoLines) kicks in if a title still doesn't fit after
  // that. Deliberately not gated on isVertical here — the pre-existing render
  // below isn't either (out of scope for this fix); only the left-gutter
  // reservation right below stays isVertical-gated, unchanged from before.
  const yAxisTitleLines = yAxisLabel
    ? wrapLabelToTwoLines(yAxisLabel, axisTitleAvailableLengthPx, tickLabelSizePx, CHART_FONT_FAMILY)
    : []

  const requiredLeftGutterPx = isVertical
    ? AXIS_LABEL_GAP_PX +
      widestYTickLabelWidthPx +
      AXIS_LABEL_GAP_PX +
      (yAxisTitleLines.length > 0 ? yAxisTitleLines.length * tickLabelSizePx + AXIS_LABEL_GAP_PX : 0)
    : 0

  // Vertical layout without a value axis: the left gutter only holds the y-axis title (if any), so
  // the default gutter floor is dropped. An explicit `padding.left` still wins.
  const hiddenValueAxisPadding: Partial<BarChartPadding> | undefined =
    isVertical && !showValueAxis ? { left: requiredLeftGutterPx } : undefined
  // labelColumns with a y-axis title: the rotated title gets its own gutter at the left edge and the
  // name column starts after it, so the two never overlap.
  const labelColumnsTitleGutterPx =
    isLabelColumns && yAxisTitleLines.length > 0
      ? yAxisTitleLines.length * tickLabelSizePx + AXIS_LABEL_GAP_PX
      : 0
  const resolvedPadding = mergePadding(
    padding,
    scaleRatio,
    requiredLeftGutterPx,
    labelColumnsPadding
      ? { ...labelColumnsPadding, left: (labelColumnsPadding.left ?? 0) + labelColumnsTitleGutterPx }
      : hiddenValueAxisPadding,
  )
  const plotWidth = viewBoxWidth - resolvedPadding.left - resolvedPadding.right
  const plotHeight = viewBoxHeight - resolvedPadding.top - resolvedPadding.bottom

  // Per-line x position for the (possibly two-line) rotated y-axis title: line 0
  // sits where the single-line title always sat (closest to the tick labels);
  // each subsequent line sits one tickLabelSizePx slot further out, matching
  // the extra width requiredLeftGutterPx reserved above.
  const yAxisTitleLineXPx = (lineIndex: number): number =>
    isLabelColumns
      ? labelColumnsTitleGutterPx - AXIS_LABEL_GAP_PX - tickLabelSizePx * (lineIndex + 0.5)
      : Math.max(
          tickLabelSizePx / 2,
          resolvedPadding.left -
            AXIS_LABEL_GAP_PX -
            widestYTickLabelWidthPx -
            AXIS_LABEL_GAP_PX -
            tickLabelSizePx * (lineIndex + 0.5),
        )

  const resolvedAccessibilityLabel =
    accessibilityLabel ??
    `${title ?? 'Bar chart'}, ${items.length} ${items.length === 1 ? 'category' : 'categories'}`

  // Position along the value axis for a given raw value, within the plot rect.
  const valueToPixel = (value: number, axisLengthPx: number): number =>
    ((value - scale.min) / valueRange) * axisLengthPx

  const slotSize = (isVertical ? plotWidth : plotHeight) / Math.max(items.length, 1)
  const barThickness = slotSize * BAR_FILL_FRACTION

  // Draws a segmented bar's pieces end to end from the baseline. Only the last
  // (outermost) piece gets the rounded corners, like a plain bar's outer edge.
  // Every piece but the last gives up a thin gap at its outer end.
  const segmentGapPx = tickLabelSizePx * SEGMENT_GAP_TO_TEXT_RATIO
  const renderSegmentPieces = (
    item: BarChartItem,
    index: number,
    pieces: BarChartSegment[],
    axisLengthPx: number,
    roundedEdge: RoundedEdge,
    pieceRect: (offsetPx: number, lengthPx: number) => { x: number; y: number; width: number; height: number },
  ) => {
    let offsetPx = 0
    return pieces.map((piece, pieceIndex) => {
      const lengthPx = (piece.value / valueRange) * axisLengthPx
      const isOuterPiece = pieceIndex === pieces.length - 1
      const rect = pieceRect(offsetPx, isOuterPiece ? lengthPx : Math.max(0, lengthPx - segmentGapPx))
      offsetPx += lengthPx
      return (
        <Path
          key={`${piece.label}-${pieceIndex}`}
          d={buildBarPath(rect.x, rect.y, rect.width, rect.height, isOuterPiece ? barCornerRadius : 0, roundedEdge)}
          fill={piece.color ?? item.color ?? barColor}
          accessible={false}
          onPress={onBarPress ? () => onBarPress(item, index) : undefined}
        />
      )
    })
  }

  // labelColumns values sit in their own column, not on the bar, so a short bar never hides one.
  const shouldShowValueLabel = (barLengthPx: number): boolean =>
    alwaysShowValueLabels ||
    (showValueLabels && (isLabelColumns || barLengthPx >= MIN_BAR_LENGTH_FOR_VALUE_LABEL_PX))

  // Zero baseline position within the plot rect, in each layout's value-axis direction.
  const zeroOffset = valueToPixel(0, isVertical ? plotHeight : plotWidth)

  // Vertical layout's category axis stacks labels side by side (crowding is a
  // *width* problem), the same shape as LineAreaChart's x-axis, so it shares
  // that shared deterministic, collision-free placement algorithm. Horizontal
  // layout stacks labels top to bottom instead, one per row inside a
  // fixed-width left column, so it's a *height* problem instead and keeps the
  // simpler adaptive-thinning approach (out of scope for this fix).
  // No fixed-pixel floor here either — see LineAreaChart's matching comment.
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
  const tooltipValueFormatter = tooltip?.valueFormatter ?? valueFormatter
  // A segmented bar's hover lists each piece then a dot-less "Total" row, with
  // the row name that a plain bar would use moved up to the second line.
  const tooltipSubheader = hoveredItem?.segments ? (tooltip?.label ?? title) : undefined
  const tooltipRows: ChartTooltipRow[] = !hoveredItem
    ? []
    : hoveredItem.segments
      ? [
          ...validSegments(hoveredItem.segments).map((segment) => ({
            color: segment.color ?? hoveredItem.color ?? barColor,
            label: segment.label,
            value: tooltipValueFormatter(segment.value),
          })),
          { label: 'Total', value: tooltipValueFormatter(hoveredItem.value) },
        ]
      : [
          {
            color: hoveredItem.color ?? barColor,
            label: tooltip?.label ?? title ?? 'Value',
            value: tooltipValueFormatter(hoveredItem.value),
          },
        ]

  // Follows the cursor along the axis bars are laid out on (horizontally for
  // vertical bars, at a fixed left offset otherwise), clamped so the
  // tooltip never overhangs the chart frame. Width is estimated from this
  // hover's actual header/rows so the clamp matches what ChartTooltip itself
  // will render at, rather than a fixed guess.
  const tooltipWidthPx = hoveredItem
    ? estimateChartTooltipWidthPx(
        hoveredItem.category,
        tooltipRows,
        viewBoxWidth,
        tooltipSubheader,
        tooltip?.rightAlignValues,
      )
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
      flexGrow={isResponsiveHeight ? 1 : undefined}
      minHeight={isResponsiveHeight ? 0 : undefined}
    >
      {title ? (
        <BarChartTitleText fontSize={fittedTitleSizePx} marginBottom={titleToChartGapPx}>
          {title}
        </BarChartTitleText>
      ) : null}
      {legend && legend.length > 0 ? <BarChartLegend items={legend} labelSizePx={legendLabelSizePx} swatchShape={swatchShape} /> : null}
      <BarChartScrollContainer
        flexGrow={isResponsiveHeight ? 1 : undefined}
        minHeight={isResponsiveHeight ? 0 : undefined}
        // A labelColumns chart that fills its host never needs sideways scrolling, and it can be as
        // short as one row, so it doesn't clip: a hover box taller than the chart shows in full.
        overflow={isLabelColumns && isResponsiveWidth ? 'visible' : 'auto'}
      >
        <BarChartPlotArea
          onMouseMove={handlePlotPointerMove}
          onMouseLeave={handlePlotPointerLeave}
          onLayout={onPlotAreaLayout}
          flexGrow={isResponsiveHeight ? 1 : undefined}
          minHeight={isResponsiveHeight ? 0 : undefined}
        >
          <Svg
            width={width}
            height={viewBoxHeight}
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
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

                {showValueAxis ? (
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
                ) : null}

                {items.map((item, index) => {
                  // Segmented bars draw their positive pieces end to end from the
                  // baseline, so their drawn length is the pieces' sum (see `segments`).
                  const pieces = item.segments
                    ? validSegments(item.segments).filter((segment) => segment.value > 0)
                    : null
                  const drawnValue = pieces
                    ? pieces.reduce((sum, segment) => sum + segment.value, 0)
                    : item.value
                  const barLength =
                    valueToPixel(drawnValue, isVertical ? plotHeight : plotWidth) - zeroOffset
                  const isPositive = drawnValue >= 0

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
                        {pieces ? (
                          renderSegmentPieces(item, index, pieces, plotHeight, 'top', (offsetPx, lengthPx) => ({
                            x: barX,
                            y: baselineY - offsetPx - lengthPx,
                            width: barThickness,
                            height: lengthPx,
                          }))
                        ) : (
                          <Path
                            d={buildBarPath(
                              barX,
                              barY,
                              barThickness,
                              barHeight,
                              barCornerRadius,
                              isPositive ? 'top' : 'bottom',
                            )}
                            fill={item.color ?? barColor}
                            accessible={false}
                            onPress={onBarPress ? () => onBarPress(item, index) : undefined}
                          />
                        )}
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
                        {shouldShowValueLabel(barHeight) ? (
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
                  const categoryLabelMaxWidth = isLabelColumns ? nameColumnWidthPx : resolvedPadding.left - 12
                  const showCategoryLabel = index % categoryLabelSkipFactor === 0
                  const categoryLabel = showCategoryLabel
                    ? truncateLabelToWidth(item.category, categoryLabelMaxWidth, tickLabelSizePx)
                    : ''

                  return (
                    <G key={`${item.category}-${index}`}>
                      {pieces ? (
                        renderSegmentPieces(item, index, pieces, plotWidth, 'right', (offsetPx, lengthPx) => ({
                          x: baselineX + offsetPx,
                          y: barY,
                          width: lengthPx,
                          height: barThickness,
                        }))
                      ) : (
                        <Path
                          d={buildBarPath(
                            barX,
                            barY,
                            barWidth,
                            barThickness,
                            barCornerRadius,
                            isPositive ? 'right' : 'left',
                          )}
                          fill={item.color ?? barColor}
                          accessible={false}
                          onPress={onBarPress ? () => onBarPress(item, index) : undefined}
                        />
                      )}
                      {showCategoryLabel ? (
                        <SvgText
                          x={isLabelColumns ? labelColumnsTitleGutterPx : resolvedPadding.left - 8}
                          y={slotStart + slotSize / 2}
                          fontSize={tickLabelSizePx}
                          fontFamily={CHART_FONT_FAMILY}
                          fill={axisLabelColor}
                          textAnchor={isLabelColumns ? 'start' : 'end'}
                          alignmentBaseline="middle"
                          accessible={false}
                        >
                          {categoryLabel}
                        </SvgText>
                      ) : null}
                      {shouldShowValueLabel(barWidth) ? (
                        <SvgText
                          x={
                            isLabelColumns
                              ? viewBoxWidth
                              : isPositive
                                ? barX + barWidth + VALUE_LABEL_GAP_PX
                                : barX - VALUE_LABEL_GAP_PX
                          }
                          y={slotStart + slotSize / 2}
                          fontSize={valueLabelSizePx}
                          fontFamily={CHART_FONT_FAMILY}
                          fill={textColor}
                          textAnchor={isLabelColumns || !isPositive ? 'end' : 'start'}
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
                y={viewBoxHeight - 6}
                fontSize={axisTitleSizePx}
                fontFamily={CHART_FONT_FAMILY}
                fill={axisLabelColor}
                textAnchor="middle"
                accessible={false}
              >
                {xAxisLabel}
              </SvgText>
            ) : null}
            {yAxisLabel
              ? // Caption-tier size (matches Text variant="caption"'s $placeholderColor/$1
                // pairing): the rotated title shares the reserved left-gutter with the tick
                // labels, so it must share their size tier rather than the roomier
                // axis-title tier the x-axis title uses below the unconstrained plot.
                // Each wrapped line pivots about its own x offset (yAxisTitleLineXPx), so
                // extra lines stack side-by-side in the gutter without any shared-origin math.
                yAxisTitleLines.map((lineText, lineIndex) => (
                  <SvgText
                    key={`y-axis-title-${lineIndex}`}
                    x={yAxisTitleLineXPx(lineIndex)}
                    y={resolvedPadding.top + plotHeight / 2}
                    fontSize={tickLabelSizePx}
                    fontFamily={CHART_FONT_FAMILY}
                    fill={axisLabelColor}
                    textAnchor="middle"
                    rotation={-90}
                    origin={`${yAxisTitleLineXPx(lineIndex)}, ${resolvedPadding.top + plotHeight / 2}`}
                    accessible={false}
                  >
                    {lineText}
                  </SvgText>
                ))
              : null}
          </Svg>
          {!isEmpty && hoveredItem ? (
            <ChartTooltip
              header={hoveredItem.category}
              subheader={tooltipSubheader}
              rows={tooltipRows}
              left={tooltipLeftPx}
              top={resolvedPadding.top}
              chartWidthPx={viewBoxWidth}
              rightAlignValues={tooltip?.rightAlignValues}
              swatchShape={swatchShape}
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
