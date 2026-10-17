import type { GoodWidgetConfig } from '@goodwidget/core'
import { defaultTokenPreset, mergeOverrideMaps } from '@goodwidget/ui'

const color = defaultTokenPreset.tokens.color

const lightCardSurface = {
  background: color.governanceSurface,
  color: color.governanceText,
  borderColor: color.governanceBorder,
  shadowColor: color.governanceShadowHover,
} as const

const darkCardSurface = {
  background: color.surface,
  color: color.textDark,
  borderColor: color.borderDark,
  shadowColor: 'rgba(3, 7, 18, 0.68)',
} as const

export const streamingSurfaceTheme = {
  backgroundColor: '$background',
  borderColor: '$borderColor',
  color: '$color',
  shadowColor: '$shadowColor',
} as const

/**
 * Streaming-widget local author defaults.
 *
 * Shared preset values stay in @goodwidget/ui. This config maps the widget's
 * Card-derived named components onto the shared light/dark card surface tokens
 * so they do not fall back to the root page background in light or dark mode.
 */
export const streamingWidgetConfig = {
  themes: {
    light_StreamRow: lightCardSurface,
    dark_StreamRow: darkCardSurface,
    light_PoolRow: lightCardSurface,
    dark_PoolRow: darkCardSurface,
    light_BalanceCard: lightCardSurface,
    dark_BalanceCard: darkCardSurface,
    light_EmptyStateCard: lightCardSurface,
    dark_EmptyStateCard: darkCardSurface,
    light_ErrorStateCard: lightCardSurface,
    dark_ErrorStateCard: darkCardSurface,
    light_SetStreamFormCard: lightCardSurface,
    dark_SetStreamFormCard: darkCardSurface,
  },
} satisfies GoodWidgetConfig

export function createStreamingWidgetConfig(config?: GoodWidgetConfig): GoodWidgetConfig {
  return {
    preset: config?.preset,
    tokens: config?.tokens,
    themes: mergeOverrideMaps(streamingWidgetConfig.themes, config?.themes),
  }
}
