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

const TREND_DIRECTION_COLOR_TOKEN: Record<ScorecardTrend['direction'], string> = {
  up: '$success',
  down: '$error',
  neutral: '$colorDim',
}

/**
 * Unwraps a Tamagui theme token to its raw color string. react-native-svg's
 * fill/stroke props aren't part of Tamagui's styling system, so they need
 * the resolved value rather than a "$token" reference.
 */
function resolveThemeColor(theme: Record<string, unknown>, token: string): string {
  const key = token.replace('$', '')
  const themeValue = theme[key]

  if (themeValue && typeof themeValue === 'object' && 'val' in themeValue) {
    return String((themeValue as { val: unknown }).val)
  }

  return typeof themeValue === 'string' ? themeValue : ''
}

const ScorecardFrame = createComponent(YStack, {
  name: 'Scorecard',
  alignItems: 'center',
  gap: '$2',
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
})

const ScorecardValueText = createComponent(TamaguiText, {
  name: 'ScorecardValueText',
  fontFamily: '$body',
  fontWeight: '700',
  color: '$primary',

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

/** Up/down/neutral arrow glyph, drawn with react-native-svg for cross-platform rendering. */
function TrendGlyph({ direction, color, size }: { direction: ScorecardTrend['direction']; color: string; size: number }) {
  const path =
    direction === 'up'
      ? 'M6 2 L10.5 9 L1.5 9 Z'
      : direction === 'down'
        ? 'M6 10 L10.5 3 L1.5 3 Z'
        : 'M2 6 H10'

  if (direction === 'neutral') {
    return (
      <Svg width={size} height={size} viewBox="0 0 12 12" accessibilityRole="image">
        <Path d={path} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      </Svg>
    )
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" accessibilityRole="image">
      <Path d={path} fill={color} />
    </Svg>
  )
}

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
    <ScorecardFrame data-testid={testID}>
      <ScorecardLabelText size={size}>{label}</ScorecardLabelText>
      <ScorecardValueRow>
        {prefix ? <ScorecardValueText size={size}>{prefix}</ScorecardValueText> : null}
        <ScorecardValueText size={size}>{formattedValue}</ScorecardValueText>
        {suffix ? <ScorecardValueText size={size}>{suffix}</ScorecardValueText> : null}
      </ScorecardValueRow>
      {trend ? (
        <ScorecardTrendRow>
          <TrendGlyph
            direction={trend.direction}
            color={resolveThemeColor(theme as unknown as Record<string, unknown>, TREND_DIRECTION_COLOR_TOKEN[trend.direction])}
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
      <Card>
        <ScorecardContent {...contentProps} />
      </Card>
    )
  }

  return <ScorecardContent {...contentProps} />
}
