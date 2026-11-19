/**
 * Scorecard — reusable KPI card: a single metric value with a label and an
 * optional trend indicator. First of 5 planned analytics chart components
 * (packages/ui hosts all of them, per #139/#141).
 *
 * Structural pattern follows FundingDistributionChart (governance-widget):
 * @goodwidget/ui primitives + useTheme() for color, react-native-svg for the
 * one graphical element (the trend arrow), so it renders identically on
 * React web, React Native, and Web Components.
 */
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import Svg, { Path } from 'react-native-svg'
import { Stack, Text as TamaguiText, useTheme, XStack, YStack } from 'tamagui'
import { createComponent } from '../createComponent'
import { Card } from './Card'
import { ChartTooltip } from './ChartTooltip'
import type { ChartSwatchShape, ChartTooltipRow } from './ChartTooltip'
import { formatMetricValue } from '../utils/formatMetricValue'
import type { MetricFormat } from '../utils/formatMetricValue'
import { resolveThemeColor } from '../utils/resolveThemeColor'

/** `tile`: a tighter card for grids of many scorecards (see ScorecardGrid). */
export type ScorecardVariant = 'bare' | 'card' | 'tile'
export type ScorecardSize = 'sm' | 'md' | 'lg'

export interface ScorecardTrend {
  value: number
  direction: 'up' | 'down' | 'neutral'
}

/** Scorecard hover box content. Rows without `color` draw no dot but keep its space
 * (e.g. a "Last week" row under "This week"). */
export interface ScorecardTooltip {
  header: string
  /** Second line under the header, regular weight and muted. */
  subheader?: string
  rows: ChartTooltipRow[]
  /** true = values in a right-aligned column, no colon, so numbers line up. Default false. */
  rightAlignValues?: boolean
  /** Shape of each row's color mark. Default 'round'. */
  swatchShape?: ChartSwatchShape
}

export interface ScorecardProps {
  value: number
  label: string
  prefix?: string
  suffix?: string
  format?: MetricFormat
  decimals?: number
  /** Formats the value; wins over `format`/`decimals` (same rule as the charts' formatters). */
  valueFormatter?: (value: number) => string
  /** `format="compact"` only: values at or above this (by size, sign ignored) are shortened
   * (12.3K, 1.7M); smaller ones show in full with thousands separators (9,876). Default 10,000.
   * Any number works (1,000 shortens from four digits); `'never'` always shows the full number.
   * K is the smallest unit, so values under 1,000 always show in full. */
  abbreviateFrom?: number | 'never'
  trend?: ScorecardTrend
  /** Replaces the computed percentage in the trend row (e.g. "+91 (+11.9%)" or "No change").
   * `trend.direction` still picks the arrow and color; `trendLabel` is still appended. A neutral
   * direction with trendText reads as plain text: no dash, normal text color. */
  trendText?: string
  trendLabel?: string
  /** Short contextual/source note rendered below the trend row (or value row, if no trend). */
  subtitle?: string
  /** Small lines directly under the value, above the trend row (e.g. a breakdown such as
   * "in G$ 866.1K" / "out G$ 835.4K"), in the subtitle's size and color. Omitted or empty = none. */
  detailLines?: string[]
  /** Marks the metric as not available: the value reads "N/A" in the muted color (no prefix/suffix),
   * this reason sits under it, and no trend row is drawn. `value` is ignored. */
  unavailableReason?: string
  /** Card and tile variants: replaces the faint top highlight with a top border in this color (e.g. a
   * team color), a sixth of the value's text size. Ignored by the bare variant. */
  accentColor?: string
  /** Hover box (web, on pointer hover): opens over the scorecard, centered on it, as wide as its
   * content and kept inside the screen. It is drawn fixed to the screen, so card edges and
   * carousels don't clip it; scrolling or Escape closes it. Omitted = no hover. */
  tooltip?: ScorecardTooltip
  variant?: ScorecardVariant
  size?: ScorecardSize
  testID?: string
}

/**
 * Golden-ratio modular type scale: every size step is the base value
 * multiplied or divided by GOLDEN_RATIO, so the whole scale can be re-tuned
 * later by adjusting these two constants instead of per-step pixel values.
 */
const SCORECARD_BASE_SIZE_PX = 24
const GOLDEN_RATIO = 1.618
const MIN_FONT_SIZE_PX = 12

const clampFontSize = (px: number): number => Math.max(px, MIN_FONT_SIZE_PX)

const VALUE_SIZE_PX: Record<ScorecardSize, number> = {
  lg: clampFontSize(SCORECARD_BASE_SIZE_PX * GOLDEN_RATIO),
  md: clampFontSize(SCORECARD_BASE_SIZE_PX),
  sm: clampFontSize(SCORECARD_BASE_SIZE_PX / GOLDEN_RATIO),
}

/** Label and trend text share the row below the value, one ratio step down. */
const SECONDARY_SIZE_PX: Record<ScorecardSize, number> = {
  lg: clampFontSize(VALUE_SIZE_PX.lg / GOLDEN_RATIO),
  md: clampFontSize(VALUE_SIZE_PX.md / GOLDEN_RATIO),
  sm: clampFontSize(VALUE_SIZE_PX.sm / GOLDEN_RATIO),
}

/** Tile variant: small text (label, detail lines, trend, subtitle) one more ratio step down. */
const TILE_SMALL_SIZE_PX: Record<ScorecardSize, number> = {
  lg: clampFontSize(SECONDARY_SIZE_PX.lg / GOLDEN_RATIO),
  md: clampFontSize(SECONDARY_SIZE_PX.md / GOLDEN_RATIO),
  sm: clampFontSize(SECONDARY_SIZE_PX.sm / GOLDEN_RATIO),
}
/** Tile variant spacing, as multiples of the value text size (approved dashboard preview:
 * 10 px / 12 px padding and 2 px between lines, around a 24 px value). */
const TILE_PADDING_VERTICAL_TO_VALUE_RATIO = 0.42
const TILE_PADDING_HORIZONTAL_TO_VALUE_RATIO = 0.5
const TILE_LINE_GAP_TO_VALUE_RATIO = 0.08

/**
 * Vertical rhythm derived from the same base/ratio as the type scale, so
 * spacing and typography stay on one proportional system instead of mixing
 * in unrelated design tokens.
 */
const LABEL_TO_VALUE_GAP_PX = SCORECARD_BASE_SIZE_PX / GOLDEN_RATIO ** 2
const VALUE_TO_TREND_GAP_PX = SCORECARD_BASE_SIZE_PX / GOLDEN_RATIO
const CARD_PADDING_PX = SCORECARD_BASE_SIZE_PX

/** Semi-transparent white applied over the card background to lift it off the canvas by lightness rather than a border. */
const CARD_ELEVATION_OVERLAY_COLOR = 'rgba(255,255,255,0.045)'
/** Simulates a light source hitting the card's top edge, replacing a hard border. */
const CARD_TOP_HIGHLIGHT_COLOR = 'rgba(255,255,255,0.06)'
const CARD_TOP_HIGHLIGHT_WIDTH_PX = 1
/** `accentColor` top border = a sixth of the card's value text size, so it follows `size`
 * (approved dashboard preview: 4 px border on a 24 px value). */
const ACCENT_BORDER_TO_VALUE_RATIO = 1 / 6

/** Default `abbreviateFrom`: numbers with five digits or more are shortened, four-digit ones read in full. */
const DEFAULT_ABBREVIATE_FROM = 10_000

/** The compact format, except below `abbreviateFrom`, where the full number shows with
 * thousands separators (decimals only when the value isn't whole, as compact does). */
function formatScorecardValue(
  value: number,
  format: MetricFormat,
  decimals: number | undefined,
  abbreviateFrom: number | 'never',
): string {
  const showsInFull =
    format === 'compact' &&
    Number.isFinite(value) &&
    (abbreviateFrom === 'never' || Math.abs(value) < abbreviateFrom)
  if (showsInFull) {
    return formatMetricValue(value, 'decimal', Number.isInteger(value) ? 0 : (decimals ?? 1))
  }
  return formatMetricValue(value, format, decimals)
}

const TREND_DIRECTION_COLOR_TOKEN: Record<ScorecardTrend['direction'], string> = {
  up: '$success',
  down: '$error',
  neutral: '$colorDim',
}

const ScorecardFrame = createComponent(YStack, {
  name: 'Scorecard',
  alignItems: 'center',
  justifyContent: 'center',
})

const ScorecardLabelText = createComponent(TamaguiText, {
  name: 'ScorecardLabelText',
  fontFamily: '$body',
  color: '$placeholderColor',
  textAlign: 'center',

  variants: {
    size: {
      sm: { fontSize: SECONDARY_SIZE_PX.sm },
      md: { fontSize: SECONDARY_SIZE_PX.md },
      lg: { fontSize: SECONDARY_SIZE_PX.lg },
    },
  } as const,

  defaultVariants: { size: 'md' },
})

const ScorecardValueRow = createComponent(XStack, {
  name: 'ScorecardValueRow',
  alignItems: 'baseline',
  gap: '$1',
  marginTop: LABEL_TO_VALUE_GAP_PX,
})

const ScorecardValueText = createComponent(TamaguiText, {
  name: 'ScorecardValueText',
  fontFamily: '$body',
  fontWeight: '700',
  // Theme text color, not $primary — $primary reads as an interactive/link
  // hue, and the value is a headline, not a call to action.
  color: '$color',

  variants: {
    size: {
      sm: { fontSize: VALUE_SIZE_PX.sm },
      md: { fontSize: VALUE_SIZE_PX.md },
      lg: { fontSize: VALUE_SIZE_PX.lg },
    },
  } as const,

  defaultVariants: { size: 'md' },
})

/**
 * Prefix/suffix (e.g. "G$", "/day") — same font size as the value since it's
 * still part of the value row, but lighter weight and dimmer color so it
 * stays subordinate to the value instead of competing with it.
 */
const ScorecardAffixText = createComponent(TamaguiText, {
  name: 'ScorecardAffixText',
  fontFamily: '$body',
  fontWeight: '400',
  color: '$placeholderColor',

  variants: {
    size: {
      sm: { fontSize: VALUE_SIZE_PX.sm },
      md: { fontSize: VALUE_SIZE_PX.md },
      lg: { fontSize: VALUE_SIZE_PX.lg },
    },
  } as const,

  defaultVariants: { size: 'md' },
})

/** Short qualifier/source note below the trend row (or value row if no trend) — same variant shape as ScorecardLabelText. */
const ScorecardSubtitleText = createComponent(TamaguiText, {
  name: 'ScorecardSubtitleText',
  fontFamily: '$body',
  color: '$placeholderColor',
  fontWeight: '400',
  textAlign: 'center',

  variants: {
    size: {
      sm: { fontSize: SECONDARY_SIZE_PX.sm },
      md: { fontSize: SECONDARY_SIZE_PX.md },
      lg: { fontSize: SECONDARY_SIZE_PX.lg },
    },
  } as const,

  defaultVariants: { size: 'md' },
})

const ScorecardTrendRow = createComponent(XStack, {
  name: 'ScorecardTrendRow',
  alignItems: 'center',
  gap: '$1',
  marginTop: VALUE_TO_TREND_GAP_PX,
})

const ScorecardTrendText = createComponent(TamaguiText, {
  name: 'ScorecardTrendText',
  fontFamily: '$body',
  fontWeight: '500',

  variants: {
    size: {
      sm: { fontSize: SECONDARY_SIZE_PX.sm },
      md: { fontSize: SECONDARY_SIZE_PX.md },
      lg: { fontSize: SECONDARY_SIZE_PX.lg },
    },
  } as const,

  defaultVariants: { size: 'md' },
})

/**
 * Up/down/neutral arrow glyph, drawn with react-native-svg for cross-platform
 * rendering. Marked decorative (accessible={false} on native, aria-hidden on
 * web) since the adjacent trend text already conveys the direction in words.
 */
function TrendGlyph({ direction, color, size }: { direction: ScorecardTrend['direction']; color: string; size: number }) {
  const path =
    direction === 'up'
      ? 'M6 2 L10.5 9 L1.5 9 Z'
      : direction === 'down'
        ? 'M6 10 L10.5 3 L1.5 3 Z'
        : 'M2 6 H10'

  if (direction === 'neutral') {
    return (
      <Svg width={size} height={size} viewBox="0 0 12 12" accessible={false} aria-hidden={true}>
        <Path d={path} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      </Svg>
    )
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" accessible={false} aria-hidden={true}>
      <Path d={path} fill={color} />
    </Svg>
  )
}

/**
 * Elevation-by-lightness overlay for the card variant: an absolutely
 * positioned semi-transparent white layer over the canvas-colored card,
 * standing in for a shadow/border so depth reads from tone, not an outline.
 * Sits as a sibling behind ScorecardContent inside a position:relative Card.
 */
const ScorecardCardOverlay = createComponent(YStack, {
  name: 'ScorecardCardOverlay',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: CARD_ELEVATION_OVERLAY_COLOR,
})

function formatTrendPercentage(trendValue: number, direction: ScorecardTrend['direction']): string {
  const magnitude = Math.abs(trendValue).toFixed(1)
  if (direction === 'up') return `+${magnitude}%`
  if (direction === 'down') return `-${magnitude}%`
  return `${magnitude}%`
}

function ScorecardContent({
  value,
  label,
  prefix,
  suffix,
  format = 'compact',
  decimals,
  valueFormatter,
  abbreviateFrom = DEFAULT_ABBREVIATE_FROM,
  trend,
  trendText,
  trendLabel,
  subtitle,
  detailLines,
  unavailableReason,
  size = 'md',
  testID,
  isTile = false,
}: Omit<ScorecardProps, 'variant' | 'accentColor' | 'tooltip'> & { isTile?: boolean }) {
  const theme = useTheme()
  const isUnavailable = unavailableReason !== undefined
  const formattedValue = valueFormatter
    ? valueFormatter(value)
    : formatScorecardValue(value, format, decimals, abbreviateFrom)
  // The tile variant overrides sizes and gaps; the other variants keep the styled defaults.
  const smallTextSizePx = isTile ? TILE_SMALL_SIZE_PX[size] : SECONDARY_SIZE_PX[size]
  const smallText = isTile ? { fontSize: smallTextSizePx } : {}
  const tileLineGapPx = VALUE_SIZE_PX[size] * TILE_LINE_GAP_TO_VALUE_RATIO
  const labelToValueGapPx = isTile ? tileLineGapPx : LABEL_TO_VALUE_GAP_PX
  const valueRowGap = isTile ? { marginTop: tileLineGapPx } : {}
  const trendRowGap = isTile ? { marginTop: 0 } : {}
  const subtitleGapPx = isTile ? 0 : VALUE_TO_TREND_GAP_PX
  // The caller's own words for a neutral trend ("No change") already say it, so they read as plain
  // text: no dash, normal text color. Without trendText the neutral dash and "0%" stay as before.
  const isPlainNeutralTrend = trend?.direction === 'neutral' && trendText !== undefined

  return (
    // testID (React Native) and data-testid (web/DOM) both set so the same
    // identifier works with either platform's test tooling.
    <ScorecardFrame testID={testID} data-testid={testID}>
      <ScorecardLabelText size={size} {...smallText}>
        {label}
      </ScorecardLabelText>
      {isUnavailable ? (
        <ScorecardValueRow {...valueRowGap}>
          <ScorecardValueText size={size} color="$placeholderColor">
            N/A
          </ScorecardValueText>
        </ScorecardValueRow>
      ) : (
        <ScorecardValueRow {...valueRowGap}>
          {prefix ? <ScorecardAffixText size={size}>{prefix}</ScorecardAffixText> : null}
          <ScorecardValueText size={size}>{formattedValue}</ScorecardValueText>
          {suffix ? <ScorecardAffixText size={size}>{suffix}</ScorecardAffixText> : null}
        </ScorecardValueRow>
      )}
      {isUnavailable ? (
        <ScorecardSubtitleText size={size} marginTop={labelToValueGapPx} {...smallText}>
          {unavailableReason}
        </ScorecardSubtitleText>
      ) : null}
      {!isUnavailable && detailLines && detailLines.length > 0 ? (
        <YStack alignItems="center" marginTop={labelToValueGapPx}>
          {detailLines.map((line, lineIndex) => (
            <ScorecardSubtitleText key={`${lineIndex}-${line}`} size={size} {...smallText}>
              {line}
            </ScorecardSubtitleText>
          ))}
        </YStack>
      ) : null}
      {trend && !isUnavailable ? (
        <ScorecardTrendRow {...trendRowGap}>
          {isPlainNeutralTrend ? null : (
            <TrendGlyph
              direction={trend.direction}
              color={resolveThemeColor(theme, TREND_DIRECTION_COLOR_TOKEN[trend.direction])}
              size={smallTextSizePx}
            />
          )}
          <ScorecardTrendText
            size={size}
            color={isPlainNeutralTrend ? '$color' : TREND_DIRECTION_COLOR_TOKEN[trend.direction]}
            {...smallText}
          >
            {trendText ?? formatTrendPercentage(trend.value, trend.direction)}
            {trendLabel ? ` ${trendLabel}` : ''}
          </ScorecardTrendText>
        </ScorecardTrendRow>
      ) : null}
      {subtitle ? (
        <ScorecardSubtitleText size={size} marginTop={subtitleGapPx} {...smallText}>
          {subtitle}
        </ScorecardSubtitleText>
      ) : null}
    </ScorecardFrame>
  )
}

export function Scorecard({ tooltip, ...props }: ScorecardProps) {
  if (!tooltip) return <ScorecardBody {...props} />
  return (
    <ScorecardHover tooltip={tooltip} size={props.size ?? 'md'}>
      {/* Fills the hover wrapper's height, so tiles in a grid row still match the tallest. */}
      <ScorecardBody {...props} fillsHeight />
    </ScorecardHover>
  )
}

function ScorecardBody({
  variant = 'bare',
  accentColor,
  fillsHeight = false,
  ...contentProps
}: Omit<ScorecardProps, 'tooltip'> & { fillsHeight?: boolean }) {
  if (variant === 'card' || variant === 'tile') {
    const isTile = variant === 'tile'
    const valueSizePx = VALUE_SIZE_PX[contentProps.size ?? 'md']
    const padding = isTile
      ? {
          paddingVertical: valueSizePx * TILE_PADDING_VERTICAL_TO_VALUE_RATIO,
          paddingHorizontal: valueSizePx * TILE_PADDING_HORIZONTAL_TO_VALUE_RATIO,
        }
      : { padding: CARD_PADDING_PX }
    return (
      // Overrides scoped to this call site only — Card.ts itself stays
      // untouched since it's shared by ~26 other widget-package consumers.
      // position:relative + overflow:hidden host the absolutely positioned
      // elevation overlay; justifyContent:center keeps content centered
      // whether or not a trend row is present, so cards with/without a
      // trend row still align evenly in a row layout.
      <Card
        position="relative"
        overflow="hidden"
        {...padding}
        backgroundColor="$background"
        borderWidth={0}
        borderTopWidth={accentColor ? valueSizePx * ACCENT_BORDER_TO_VALUE_RATIO : CARD_TOP_HIGHLIGHT_WIDTH_PX}
        borderTopColor={accentColor ?? CARD_TOP_HIGHLIGHT_COLOR}
        shadowOpacity={0}
        justifyContent="center"
        {...(fillsHeight ? { flexGrow: 1 } : {})}
      >
        <ScorecardCardOverlay />
        <ScorecardContent {...contentProps} isTile={isTile} />
      </Card>
    )
  }

  return <ScorecardContent {...contentProps} />
}

/** Space kept between the hover box and the screen edge = a third of the value text. */
const HOVER_SCREEN_MARGIN_TO_VALUE_RATIO = 1 / 3
/** Above every card, chart and carousel arrow on the page. */
const HOVER_BOX_Z_INDEX = 1000

/**
 * Hover box for a scorecard, positioned the way the package's Tooltip is: `position: fixed`
 * from the scorecard's on-screen box, so overflow-clipping ancestors (the card itself, a
 * carousel track) can't cut it, while it stays inside the widget's own DOM where the theme
 * styles live. Centered on the scorecard, then moved just enough to stay on screen.
 */
/** Visible screen width; Infinity where there is no window (no cap). */
function screenWidthPx(): number {
  if (typeof window === 'undefined') return Infinity
  return window.visualViewport?.width ?? window.innerWidth
}

function ScorecardHover({
  tooltip,
  size,
  children,
}: {
  tooltip: ScorecardTooltip
  size: ScorecardSize
  children: React.ReactNode
}) {
  const triggerRef = useRef<HTMLElement | null>(null)
  const boxRef = useRef<HTMLElement | null>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const screenMarginPx = VALUE_SIZE_PX[size] * HOVER_SCREEN_MARGIN_TO_VALUE_RATIO

  const show = () => {
    const triggerRect = triggerRef.current?.getBoundingClientRect?.()
    if (!triggerRect) return
    // First frame at the scorecard's center; the layout effect re-centers it once the box is measured.
    setPosition({ left: triggerRect.left + triggerRect.width / 2, top: triggerRect.top + triggerRect.height / 2 })
  }
  const hide = useCallback(() => setPosition(null), [])
  // Keyboard: the scorecard takes focus and the box stays open while it has focus or the pointer
  // is over it (like the package's Tooltip); Escape, scroll or losing both closes it.
  const tooltipId = useId()
  const hoveredRef = useRef(false)
  const focusedRef = useRef(false)

  // Measure the rendered box before paint, center it on the scorecard, keep it on screen.
  useLayoutEffect(() => {
    if (!position || typeof window === 'undefined') return
    const triggerRect = triggerRef.current?.getBoundingClientRect?.()
    // The box (ChartTooltip's frame) is absolutely positioned inside the fixed anchor.
    const boxRect = (boxRef.current?.firstElementChild as HTMLElement | null)?.getBoundingClientRect?.()
    if (!triggerRect || !boxRect) return
    const screenWidth = screenWidthPx()
    const screenHeight = window.visualViewport?.height ?? window.innerHeight
    const keepOnScreen = (start: number, length: number, screenLength: number) =>
      Math.max(screenMarginPx, Math.min(start, screenLength - screenMarginPx - length))
    const left = keepOnScreen(triggerRect.left + triggerRect.width / 2 - boxRect.width / 2, boxRect.width, screenWidth)
    const top = keepOnScreen(triggerRect.top + triggerRect.height / 2 - boxRect.height / 2, boxRect.height, screenHeight)
    if (Math.abs(left - position.left) > 0.5 || Math.abs(top - position.top) > 0.5) setPosition({ left, top })
  }, [position, screenMarginPx])

  // Scroll events inside a shadow root do not reach window, so listen on both (as Tooltip does).
  useEffect(() => {
    if (!position || typeof window === 'undefined') return undefined
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide()
    }
    const root = triggerRef.current?.getRootNode()
    root?.addEventListener('scroll', hide, true)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      root?.removeEventListener('scroll', hide, true)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [position, hide])

  return (
    <Stack
      ref={triggerRef as React.Ref<never>}
      tabIndex={0}
      aria-describedby={position ? tooltipId : undefined}
      onHoverIn={() => {
        hoveredRef.current = true
        show()
      }}
      onHoverOut={() => {
        hoveredRef.current = false
        if (!focusedRef.current) hide()
      }}
      onFocus={() => {
        focusedRef.current = true
        show()
      }}
      onBlur={() => {
        focusedRef.current = false
        if (!hoveredRef.current) hide()
      }}
    >
      {children}
      {position ? (
        <Stack
          ref={boxRef as React.Ref<never>}
          id={tooltipId}
          role="tooltip"
          pointerEvents="none"
          style={{ position: 'fixed', left: position.left, top: position.top, zIndex: HOVER_BOX_Z_INDEX }}
        >
          <ChartTooltip
            header={tooltip.header}
            subheader={tooltip.subheader}
            rows={tooltip.rows}
            left={0}
            top={0}
            rightAlignValues={tooltip.rightAlignValues}
            swatchShape={tooltip.swatchShape}
            maxWidthPx={screenWidthPx() - screenMarginPx * 2}
          />
        </Stack>
      ) : null}
    </Stack>
  )
}

export interface ScorecardGridProps {
  /** Scorecards, usually `variant="tile"`. */
  children: React.ReactNode
  /** The scorecards' `size`, so the column width follows their value text. Default "md". */
  size?: ScorecardSize
  testID?: string
}

/** Grid columns are at least 6.25 x the value text wide and 0.42 x apart (approved dashboard
 * preview: 150 px columns and 10 px gaps around a 24 px value). */
const GRID_MIN_COLUMN_TO_VALUE_RATIO = 6.25
const GRID_GAP_TO_VALUE_RATIO = 0.42

/**
 * Lays scorecards out in equal-width columns, as many per row as the width allows; tiles in a
 * row share the tallest one's height. Web only (CSS grid), like Carousel.
 */
export function ScorecardGrid({ children, size = 'md', testID }: ScorecardGridProps) {
  const valueSizePx = VALUE_SIZE_PX[size]
  return (
    <YStack
      testID={testID}
      data-testid={testID}
      width="100%"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${valueSizePx * GRID_MIN_COLUMN_TO_VALUE_RATIO}px, 1fr))`,
        gap: valueSizePx * GRID_GAP_TO_VALUE_RATIO,
      }}
    >
      {children}
    </YStack>
  )
}
