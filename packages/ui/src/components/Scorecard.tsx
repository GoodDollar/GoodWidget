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
import React from 'react'
import Svg, { Path } from 'react-native-svg'
import { Text as TamaguiText, useTheme, XStack, YStack } from 'tamagui'
import { createComponent } from '../createComponent'
import { Card } from './Card'
import { formatMetricValue } from '../utils/formatMetricValue'
import type { MetricFormat } from '../utils/formatMetricValue'
import { resolveThemeColor } from '../utils/resolveThemeColor'

export type ScorecardVariant = 'bare' | 'card'
export type ScorecardSize = 'sm' | 'md' | 'lg'

export interface ScorecardTrend {
  value: number
  direction: 'up' | 'down' | 'neutral'
}

export interface ScorecardProps {
  value: number
  label: string
  prefix?: string
  suffix?: string
  format?: MetricFormat
  decimals?: number
  trend?: ScorecardTrend
  trendLabel?: string
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
  trend,
  trendLabel,
  size = 'md',
  testID,
}: Omit<ScorecardProps, 'variant'>) {
  const theme = useTheme()
  const formattedValue = formatMetricValue(value, format, decimals)

  return (
    // testID (React Native) and data-testid (web/DOM) both set so the same
    // identifier works with either platform's test tooling.
    <ScorecardFrame testID={testID} data-testid={testID}>
      <ScorecardLabelText size={size}>{label}</ScorecardLabelText>
      <ScorecardValueRow>
        {prefix ? <ScorecardAffixText size={size}>{prefix}</ScorecardAffixText> : null}
        <ScorecardValueText size={size}>{formattedValue}</ScorecardValueText>
        {suffix ? <ScorecardAffixText size={size}>{suffix}</ScorecardAffixText> : null}
      </ScorecardValueRow>
      {trend ? (
        <ScorecardTrendRow>
          <TrendGlyph
            direction={trend.direction}
            color={resolveThemeColor(theme, TREND_DIRECTION_COLOR_TOKEN[trend.direction])}
            size={SECONDARY_SIZE_PX[size]}
          />
          <ScorecardTrendText size={size} color={TREND_DIRECTION_COLOR_TOKEN[trend.direction]}>
            {formatTrendPercentage(trend.value, trend.direction)}
            {trendLabel ? ` ${trendLabel}` : ''}
          </ScorecardTrendText>
        </ScorecardTrendRow>
      ) : null}
    </ScorecardFrame>
  )
}

export function Scorecard({ variant = 'bare', ...contentProps }: ScorecardProps) {
  if (variant === 'card') {
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
        padding={CARD_PADDING_PX}
        backgroundColor="$background"
        borderWidth={0}
        borderTopWidth={1}
        borderTopColor={CARD_TOP_HIGHLIGHT_COLOR}
        shadowOpacity={0}
        justifyContent="center"
      >
        <ScorecardCardOverlay />
        <ScorecardContent {...contentProps} />
      </Card>
    )
  }

  return <ScorecardContent {...contentProps} />
}
