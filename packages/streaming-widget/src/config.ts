import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/core'
import { defaultTokenPreset, mergeOverrideMaps } from '@goodwidget/ui'

type ColorPalette = typeof defaultTokenPreset.tokens.color

function buildSurfacePair(color: ColorPalette) {
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

  return {
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
  }
}

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
  themes: buildSurfacePair(defaultTokenPreset.tokens.color),
} satisfies GoodWidgetConfig

export function createStreamingWidgetConfig(
  config?: GoodWidgetConfig,
  themeOverrides?: GoodWidgetThemeOverrides,
): GoodWidgetConfig {
  const effectiveColor: ColorPalette = {
    ...defaultTokenPreset.tokens.color,
    ...(config?.preset?.tokens?.color ?? {}),
    ...(config?.tokens?.color ?? {}),
    ...(themeOverrides?.tokens?.color ?? {}),
  } as ColorPalette

  const derivedSurfaceThemes = buildSurfacePair(effectiveColor)

  return {
    preset: config?.preset,
    tokens: config?.tokens,
    themes: mergeOverrideMaps(derivedSurfaceThemes, config?.themes),
  }
}
