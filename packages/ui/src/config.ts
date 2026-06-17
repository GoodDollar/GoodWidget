import { createFont, createTamagui } from 'tamagui'
import { createAnimations } from '@tamagui/animations-react-native'
import type {
  GoodWidgetConfig,
  GoodWidgetThemes,
  GoodWidgetThemeOverrides,
  GoodWidgetThemeValues,
  GoodWidgetTokenOverrides,
  GoodWidgetTokenValues,
  WidgetAnimationConfig,
  WidgetAnimationsPreset,
  WidgetFontDefinition,
} from './configTypes'
import { goodWalletV2Preset } from './presets'
import { createGoodWidgetTokens, createThemeValues, defaultTokenValues } from './theme'

export const defaultPreset = goodWalletV2Preset

const defaultBodyFont = {
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
} satisfies WidgetFontDefinition

const defaultAnimations = {
  quick: { type: 'timing', duration: 150 },
  medium: { type: 'timing', duration: 400 },
  slow: { type: 'timing', duration: 520 },
  exit: { type: 'timing', duration: 280 },
} satisfies Required<WidgetAnimationsPreset>

/**
 * Builds a single Tamagui font by layering a preset font definition onto the shared
 * GoodWidget font defaults. This stays close to Tamagui's documented `createFont` flow.
 */
function createWidgetFont(overrides?: WidgetFontDefinition) {
  return createFont({
    family: overrides?.family ?? defaultBodyFont.family,
    size: {
      ...defaultBodyFont.size,
      ...overrides?.size,
    },
    lineHeight: {
      ...defaultBodyFont.lineHeight,
      ...overrides?.lineHeight,
    },
    weight: {
      ...defaultBodyFont.weight,
      ...overrides?.weight,
    },
    letterSpacing: {
      ...defaultBodyFont.letterSpacing,
      ...overrides?.letterSpacing,
    },
  })
}

/**
 * Merges token overrides into a full token set.
 * This runs before theme derivation so themes always track effective token values.
 */
function mergeTokenValues(
  base: GoodWidgetTokenValues,
  override?: GoodWidgetTokenOverrides,
): GoodWidgetTokenValues {
  if (!override) return base

  return {
    color: { ...base.color, ...override.color } as GoodWidgetTokenValues['color'],
    size: { ...base.size, ...override.size } as GoodWidgetTokenValues['size'],
    space: { ...base.space, ...override.space } as GoodWidgetTokenValues['space'],
    radius: { ...base.radius, ...override.radius } as GoodWidgetTokenValues['radius'],
    zIndex: { ...base.zIndex, ...override.zIndex } as GoodWidgetTokenValues['zIndex'],
  }
}

/**
 * Merges token override objects without expanding them to full token sets.
 * Used when carrying user-provided override intent through provider layers.
 */
function mergeTokenOverrides(
  base?: GoodWidgetTokenOverrides,
  override?: GoodWidgetTokenOverrides,
): GoodWidgetTokenOverrides | undefined {
  if (!base && !override) return undefined

  const merged: GoodWidgetTokenOverrides = {
    ...(base ?? {}),
  }

  if (override?.color) merged.color = { ...(base?.color ?? {}), ...override.color }
  if (override?.size) merged.size = { ...(base?.size ?? {}), ...override.size }
  if (override?.space) merged.space = { ...(base?.space ?? {}), ...override.space }
  if (override?.radius) merged.radius = { ...(base?.radius ?? {}), ...override.radius }
  if (override?.zIndex) merged.zIndex = { ...(base?.zIndex ?? {}), ...override.zIndex }

  return merged
}

/**
 * Merges a full theme map with optional partial theme overrides.
 */
function mergeThemes(
  base: GoodWidgetThemes,
  override?: GoodWidgetConfig['themes'],
): GoodWidgetThemes {
  if (!override) return base

  const merged: GoodWidgetThemes = {}

  for (const [name, definition] of Object.entries(base)) {
    merged[name] = { ...definition }
  }

  for (const [name, definition] of Object.entries(override)) {
    merged[name] = { ...(merged[name] ?? {}), ...definition } as GoodWidgetThemeValues
  }

  return merged
}

/**
 * Merges a preset-provided animation map on top of the shared GoodWidget defaults.
 * The React Native animation driver expects config objects, not CSS animation strings.
 */
function mergeAnimations(override?: WidgetAnimationsPreset) {
  const mergeAnimation = (
    base: WidgetAnimationConfig,
    next?: WidgetAnimationConfig,
  ): WidgetAnimationConfig => ({
    ...base,
    ...next,
  })

  return {
    quick: mergeAnimation(defaultAnimations.quick, override?.quick),
    medium: mergeAnimation(defaultAnimations.medium, override?.medium),
    slow: mergeAnimation(defaultAnimations.slow, override?.slow),
    exit: mergeAnimation(defaultAnimations.exit, override?.exit),
  }
}

/**
 * Resolves the shipped preset and any direct config overrides into the same native merge
 * layers already used by the GoodWidget config flow.
 */
function resolveConfigLayers(overrides?: GoodWidgetConfig) {
  const preset = overrides?.preset ?? defaultPreset

  return {
    preset,
    animations: mergeAnimations(preset?.animations),
    tokens: mergeTokenOverrides(preset?.tokens, overrides?.tokens),
    themes: mergeOverrideMaps(preset?.themes, overrides?.themes),
  }
}

/**
 * Creates the effective plain theme map from config-level overrides.
 * Flow: merge token overrides -> derive base themes from tokens -> apply theme overrides.
 */
export function createGoodWidgetThemes(overrides?: GoodWidgetConfig): GoodWidgetThemes {
  const resolvedConfig = resolveConfigLayers(overrides)
  const mergedTokenValues = mergeTokenValues(defaultTokenValues, resolvedConfig.tokens)
  const baseThemes = createThemeValues(mergedTokenValues)
  return mergeThemes(baseThemes, resolvedConfig.themes)
}

/**
 * Creates the final Tamagui config consumed by `TamaguiProvider`.
 */
export function createGoodWidgetConfig(overrides?: GoodWidgetConfig) {
  const resolvedConfig = resolveConfigLayers(overrides)
  const mergedTokenValues = mergeTokenValues(defaultTokenValues, resolvedConfig.tokens)
  const themes = mergeThemes(createThemeValues(mergedTokenValues), resolvedConfig.themes)
  const bodyFont = createWidgetFont(resolvedConfig.preset?.typography?.body)
  const headingFont = createWidgetFont(
    resolvedConfig.preset?.typography?.heading ?? resolvedConfig.preset?.typography?.body,
  )

  return createTamagui({
    tokens: createGoodWidgetTokens(mergedTokenValues),
    themes,
    animations: createAnimations(resolvedConfig.animations),
    fonts: {
      heading: headingFont,
      body: bodyFont,
    },
    defaultFont: 'body',
    media: {
      sm: { maxWidth: 480 },
      md: { maxWidth: 768 },
      gtSm: { minWidth: 481 },
      gtMd: { minWidth: 769 },
    },
  })
}

/**
 * Merges partial theme override maps by theme name.
 */
function mergeOverrideMaps(
  base?: Record<string, Partial<GoodWidgetThemeValues>>,
  override?: Record<string, Partial<GoodWidgetThemeValues>>,
): Record<string, Partial<GoodWidgetThemeValues>> | undefined {
  if (!base && !override) return undefined

  const merged: Record<string, Partial<GoodWidgetThemeValues>> = {
    ...(base ?? {}),
  }

  if (override) {
    for (const [name, values] of Object.entries(override)) {
      merged[name] = { ...(merged[name] ?? {}), ...values } as Partial<GoodWidgetThemeValues>
    }
  }

  return merged
}

/**
 * Merges host overrides on top of author config.
 * Precedence: base config < host overrides.
 */
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
    preset: baseConfig.preset,
    tokens: mergeTokenOverrides(baseConfig.tokens, hostOverrides.tokens),
    themes: mergeOverrideMaps(baseConfig.themes, hostOverrides.themes),
  }
}

export type TamaguiConfig = ReturnType<typeof createGoodWidgetConfig>

export const defaultConfig = createGoodWidgetConfig()
