import { createFont, createTamagui } from 'tamagui'
import { tokens, lightTheme, darkTheme, lightComponentThemes, darkComponentThemes } from './theme'
import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from './configTypes'

const defaultFont = createFont({
  family: 'System',
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 40,
    10: 48,
    true: 16,
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 24,
    4: 26,
    5: 28,
    6: 32,
    7: 36,
    8: 40,
    9: 48,
    10: 56,
    true: 24,
  },
  weight: {
    1: '400',
    2: '400',
    3: '400',
    4: '500',
    5: '500',
    6: '600',
    7: '700',
    8: '700',
    9: '800',
    10: '900',
    true: '400',
  },
  letterSpacing: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: -0.5,
    7: -0.5,
    8: -1,
    9: -1,
    10: -1.5,
    true: 0,
  },
})

function deepMerge<T extends Record<string, unknown>>(base: T, override?: Partial<T>): T {
  if (!override) return base
  const result = { ...base }
  for (const key of Object.keys(override) as Array<keyof T>) {
    const val = override[key]
    if (val && typeof val === 'object' && !Array.isArray(val) && typeof base[key] === 'object') {
      result[key] = deepMerge(
        base[key] as Record<string, unknown>,
        val as Record<string, unknown>,
      ) as T[keyof T]
    } else if (val !== undefined) {
      result[key] = val as T[keyof T]
    }
  }
  return result
}

export function createGoodWidgetConfig(overrides?: GoodWidgetConfig) {
  const mergedTokens = overrides?.tokens
    ? {
        ...tokens,
        color: { ...tokens.color, ...overrides.tokens.color },
        size: { ...tokens.size, ...overrides.tokens.size },
        space: { ...tokens.space, ...overrides.tokens.space },
        radius: { ...tokens.radius, ...overrides.tokens.radius },
      }
    : tokens

  const allThemes: Record<string, ReturnType<typeof import('tamagui').createTheme>> = {
    light: lightTheme,
    dark: darkTheme,
    ...lightComponentThemes,
    ...darkComponentThemes,
  }

  if (overrides?.themes) {
    for (const [name, themeOverride] of Object.entries(overrides.themes)) {
      if (allThemes[name]) {
        allThemes[name] = deepMerge(
          allThemes[name] as Record<string, unknown>,
          themeOverride as Record<string, unknown>,
        ) as (typeof allThemes)[string]
      } else {
        allThemes[name] = themeOverride as (typeof allThemes)[string]
      }
    }
  }

  return createTamagui({
    tokens: mergedTokens,
    themes: allThemes,
    fonts: {
      heading: defaultFont,
      body: defaultFont,
    },
    defaultFont: 'body',
  })
}

export function mergeThemeOverrides(
  baseConfig: GoodWidgetConfig | undefined,
  hostOverrides: GoodWidgetThemeOverrides | undefined,
): GoodWidgetConfig | undefined {
  if (!hostOverrides) return baseConfig
  if (!baseConfig) {
    return {
      tokens: hostOverrides.tokens,
      themes: hostOverrides.themes,
    }
  }
  return {
    tokens: deepMerge(
      (baseConfig.tokens ?? {}) as Record<string, Record<string, string | number>>,
      hostOverrides.tokens as Record<string, Record<string, string | number>> | undefined,
    ),
    themes: deepMerge(
      (baseConfig.themes ?? {}) as Record<string, Record<string, string | number>>,
      hostOverrides.themes as Record<string, Record<string, string | number>> | undefined,
    ),
  }
}

export type TamaguiConfig = ReturnType<typeof createGoodWidgetConfig>

export const defaultConfig = createGoodWidgetConfig()
