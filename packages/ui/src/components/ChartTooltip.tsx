/**
 * ChartTooltip — hover tooltip shared by LineAreaChart, BarChart, and
 * PieDonutChart (QA fix: none of the 3 chart components showed anything on
 * hover before this). Each caller computes `left`/`top` itself, in the same
 * pixel space as its own SVG viewBox — all 3 charts render their `<Svg>` at
 * `viewBox` dimensions equal to its actual CSS pixel size (no scaling
 * transform in between), so no unit conversion is needed here.
 */
import React from 'react'
import { Text as TamaguiText, XStack, YStack } from 'tamagui'
import { createComponent } from '../createComponent'
import { estimateTextWidthPx, truncateLabelToWidth } from '../utils/textWidthEstimate'

export interface ChartTooltipRow {
  color: string
  label: string
  value: string
}

export interface ChartTooltipProps {
  header: string
  rows: ChartTooltipRow[]
  left: number
  top: number
  /** The hosting chart's own pixel width — the tooltip's cap is derived from
   * this (see `TOOLTIP_MAX_WIDTH_RATIO`), never a fixed pixel guess. */
  chartWidthPx: number
}

const TOOLTIP_HEADER_FONT_SIZE_PX = 12
const TOOLTIP_ROW_FONT_SIZE_PX = 12
const TOOLTIP_PADDING_HORIZONTAL_PX = 12
const TOOLTIP_DOT_SIZE_PX = 8
const TOOLTIP_DOT_TO_TEXT_GAP_PX = 8
/** ChartTooltipFrame's `borderWidth` — border-box sizing means this eats into
 * the frame's own content area on both sides, so it must be subtracted here
 * too or the row's real available width comes up short of what was estimated. */
const TOOLTIP_BORDER_WIDTH_PX = 1
/** QA fix: the numeric value must never truncate — width expands to fit the
 * longest value, only the series label ellipsizes once it would push the
 * tooltip past `TOOLTIP_MAX_WIDTH_RATIO` of the hosting chart's own width. */
const TOOLTIP_MIN_WIDTH_PX = 96
/** Tooltip width never exceeds this fraction of the hosting chart's own
 * pixel width — generalizes to any chart size instead of a fixed pixel cap
 * tuned to one dashboard's typical content length. */
const TOOLTIP_MAX_WIDTH_RATIO = 0.8

function formatRowValueText(value: string): string {
  return `: ${value}`
}

function estimateRowContentWidthPx(row: ChartTooltipRow): number {
  const labelWidthPx = estimateTextWidthPx(row.label, TOOLTIP_ROW_FONT_SIZE_PX)
  const valueWidthPx = estimateTextWidthPx(formatRowValueText(row.value), TOOLTIP_ROW_FONT_SIZE_PX)
  // The row is an XStack with `gap="$2"` between all 3 children (dot, label,
  // value) — that's two gaps (dot→label, label→value), not one.
  return TOOLTIP_DOT_SIZE_PX + TOOLTIP_DOT_TO_TEXT_GAP_PX * 2 + labelWidthPx + valueWidthPx
}

/**
 * Estimates the tooltip's rendered width from its actual header/rows so
 * every caller can clamp the tooltip's horizontal position against the same
 * width ChartTooltip itself will use to render. `chartWidthPx` is the hosting
 * chart's own real pixel width — the tooltip only truncates once its content
 * would exceed `TOOLTIP_MAX_WIDTH_RATIO` of that, never a fixed pixel guess.
 */
export function estimateChartTooltipWidthPx(
  header: string,
  rows: ChartTooltipRow[],
  chartWidthPx: number,
): number {
  // Header renders bold (see ChartTooltipHeaderText) — matching fontWeight
  // keeps this estimate consistent with the glyph widths that actually render.
  const headerWidthPx = estimateTextWidthPx(header, TOOLTIP_HEADER_FONT_SIZE_PX, undefined, '700')
  const widestRowWidthPx = rows.reduce((widest, row) => Math.max(widest, estimateRowContentWidthPx(row)), 0)
  const contentWidthPx = Math.max(headerWidthPx, widestRowWidthPx)
  const widthPx = contentWidthPx + TOOLTIP_PADDING_HORIZONTAL_PX * 2 + TOOLTIP_BORDER_WIDTH_PX * 2
  const maxWidthPx = Math.max(TOOLTIP_MIN_WIDTH_PX, chartWidthPx * TOOLTIP_MAX_WIDTH_RATIO)

  return Math.min(maxWidthPx, Math.max(TOOLTIP_MIN_WIDTH_PX, widthPx))
}

const ChartTooltipFrame = createComponent(YStack, {
  name: 'ChartTooltipFrame',
  position: 'absolute',
  backgroundColor: '$background',
  borderWidth: TOOLTIP_BORDER_WIDTH_PX,
  borderColor: '$borderColor',
  borderRadius: '$3',
  paddingHorizontal: TOOLTIP_PADDING_HORIZONTAL_PX,
  paddingVertical: '$2',
  gap: '$1',
  zIndex: 10,
  // Purely informational overlay — must never intercept the mouse events the
  // hosting chart relies on to keep tracking the cursor while it's hovered.
  pointerEvents: 'none',
})

const ChartTooltipHeaderText = createComponent(TamaguiText, {
  name: 'ChartTooltipHeaderText',
  fontFamily: '$body',
  fontWeight: '700',
  fontSize: TOOLTIP_HEADER_FONT_SIZE_PX,
  color: '$color',
})

/** Series name — shrinks and ellipsizes first when a row doesn't fit. */
const ChartTooltipLabelText = createComponent(TamaguiText, {
  name: 'ChartTooltipLabelText',
  fontFamily: '$body',
  fontSize: TOOLTIP_ROW_FONT_SIZE_PX,
  color: '$color',
  flexShrink: 1,
})

/** Numeric value — never shrinks or truncates, per QA fix. */
const ChartTooltipValueText = createComponent(TamaguiText, {
  name: 'ChartTooltipValueText',
  fontFamily: '$body',
  fontSize: TOOLTIP_ROW_FONT_SIZE_PX,
  color: '$color',
  flexShrink: 0,
})

const ChartTooltipDot = createComponent(YStack, {
  name: 'ChartTooltipDot',
  width: TOOLTIP_DOT_SIZE_PX,
  height: TOOLTIP_DOT_SIZE_PX,
  borderRadius: '$full',
  flexShrink: 0,
})

export function ChartTooltip({ header, rows, left, top, chartWidthPx }: ChartTooltipProps) {
  const widthPx = estimateChartTooltipWidthPx(header, rows, chartWidthPx)
  // Space left for label text once the frame's padding and border, the dot,
  // both gaps, and the full (never-truncated) value are accounted for —
  // matches estimateRowContentWidthPx plus the border-box border itself.
  const availableTextWidthPx =
    widthPx -
    TOOLTIP_PADDING_HORIZONTAL_PX * 2 -
    TOOLTIP_BORDER_WIDTH_PX * 2 -
    TOOLTIP_DOT_SIZE_PX -
    TOOLTIP_DOT_TO_TEXT_GAP_PX * 2

  return (
    <ChartTooltipFrame left={left} top={top} width={widthPx} data-testid="chart-tooltip">
      <ChartTooltipHeaderText numberOfLines={1} ellipsizeMode="tail">
        {header}
      </ChartTooltipHeaderText>
      {rows.map((row) => {
        const valueText = formatRowValueText(row.value)
        const labelMaxWidthPx = Math.max(
          0,
          availableTextWidthPx - estimateTextWidthPx(valueText, TOOLTIP_ROW_FONT_SIZE_PX),
        )
        const label = truncateLabelToWidth(row.label, labelMaxWidthPx, TOOLTIP_ROW_FONT_SIZE_PX)

        return (
          <XStack key={row.label} alignItems="center" gap="$2">
            <ChartTooltipDot backgroundColor={row.color} />
            <ChartTooltipLabelText numberOfLines={1} ellipsizeMode="tail">
              {label}
            </ChartTooltipLabelText>
            <ChartTooltipValueText numberOfLines={1}>{valueText}</ChartTooltipValueText>
          </XStack>
        )
      })}
    </ChartTooltipFrame>
  )
}
