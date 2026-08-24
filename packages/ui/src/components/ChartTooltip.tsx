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
}

/** Estimated rendered width, used by every caller to clamp `left` so the tooltip never overhangs its chart's own bounds. */
export const CHART_TOOLTIP_WIDTH_PX = 200

const ChartTooltipFrame = createComponent(YStack, {
  name: 'ChartTooltipFrame',
  position: 'absolute',
  width: CHART_TOOLTIP_WIDTH_PX,
  backgroundColor: '$background',
  borderWidth: 1,
  borderColor: '$borderColor',
  borderRadius: '$3',
  paddingHorizontal: '$3',
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
  fontSize: 12,
  color: '$color',
})

const ChartTooltipRowText = createComponent(TamaguiText, {
  name: 'ChartTooltipRowText',
  fontFamily: '$body',
  fontSize: 12,
  color: '$color',
  flexShrink: 1,
})

const ChartTooltipDot = createComponent(YStack, {
  name: 'ChartTooltipDot',
  width: 8,
  height: 8,
  borderRadius: '$full',
  flexShrink: 0,
})

export function ChartTooltip({ header, rows, left, top }: ChartTooltipProps) {
  return (
    <ChartTooltipFrame left={left} top={top} data-testid="chart-tooltip">
      <ChartTooltipHeaderText numberOfLines={1}>{header}</ChartTooltipHeaderText>
      {rows.map((row) => (
        <XStack key={row.label} alignItems="center" gap="$2">
          <ChartTooltipDot backgroundColor={row.color} />
          <ChartTooltipRowText numberOfLines={1} ellipsizeMode="tail">
            {row.label}: {row.value}
          </ChartTooltipRowText>
        </XStack>
      ))}
    </ChartTooltipFrame>
  )
}
