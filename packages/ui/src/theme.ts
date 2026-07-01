import { createTokens } from 'tamagui'
import type { GoodWidgetThemes, GoodWidgetTokenValues } from './configTypes'

/**
 * Base design-token seed values for the GoodWidget design system.
 * These are plain values so token overrides can be merged before creating Tamagui tokens.
 */
export const defaultTokenValues = {
  color: {
    primary: '#00AEFF',
    primaryDark: '#0085C5',
    primaryLight: '#66CFFF',
    secondary: '#00C3AE',
    secondaryDark: '#009A89',
    success: '#00B0AD',
    successMuted: 'rgba(0, 176, 173, 0.15)',
    warning: '#F5A623',
    warningMuted: 'rgba(245, 166, 35, 0.16)',
    error: '#E53935',
    errorLight: '#FFCDD2',
    errorMuted: 'rgba(229, 57, 53, 0.15)',
    infoMuted: 'rgba(0, 174, 255, 0.16)',

    white: '#FFFFFF',
    black: '#000000',
    background: '#FFFFFF',
    backgroundDark: '#121212',
    surface: '#F5F7FA',
    surfaceDark: '#1E1E1E',
    text: '#333333',
    textDark: '#E0E0E0',
    textSecondary: '#71727A',
    textSecondaryDark: '#A0A0A0',
    // Mid-level soft text — between primary text and muted/secondary text
    // Light mode: medium gray readable on white backgrounds
    textSoft: '#888888',
    // Dark mode: lighter gray for readability on dark backgrounds
    textSoftDark: '#BBBBBB',
    // Dim text — below secondary, used for tertiary labels
    // Light mode: readable but subdued on white backgrounds
    textDim: '#555555',
    // Dark mode: mid-level gray on dark backgrounds
    textDimDark: '#888888',
    border: '#E0E0E0',
    borderDark: '#333333',
    overlay: 'rgba(0,0,0,0.5)',
    transparent: 'transparent',
  },
  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    11: 48,
    12: 56,
    13: 64,
    14: 80,
    maxContentWidth: 768,
    // Icon sizes — mirrors the preset icon token scale
    icon2xs: 12,
    iconXs: 16,
    iconSm: 20,
    iconMd: 24,
    iconLg: 32,
    iconXl: 48,
    icon2xl: 64,
    true: 40,
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    true: 16,
  },
  radius: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    // Full pill radius — used by Button default and round variants
    full: 9999,
    true: 8,
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
} satisfies GoodWidgetTokenValues

/**
 * Creates Tamagui tokens from plain token values.
 */
export function createGoodWidgetTokens(tokenValues: GoodWidgetTokenValues = defaultTokenValues) {
  return createTokens(tokenValues as Parameters<typeof createTokens>[0])
}

/**
 * Derives the full semantic theme map (base + component sub-themes) from token values.
 * Output is plain objects accepted directly by `createTamagui({ themes })`.
 */
export function createThemeValues(
  tokenValues: GoodWidgetTokenValues = defaultTokenValues,
): GoodWidgetThemes {
  const { color } = tokenValues

  return {
    light: {
      background: color.background,
      backgroundHover: color.surface,
      backgroundPress: color.border,
      backgroundFocus: color.surface,
      backgroundTransparent: color.transparent,
      backgroundOverlay: color.overlay,

      color: color.text,
      colorHover: color.text,
      colorPress: color.textSecondary,
      colorFocus: color.text,
      colorTransparent: color.transparent,
      // Soft text — between primary text and muted; for secondary labels
      colorSoft: color.textSoft,
      // Dim text — below secondary; for tertiary/helper labels
      colorDim: color.textDim,

      borderColor: color.border,
      borderColorHover: color.primary,
      borderColorPress: color.primaryDark,
      borderColorFocus: color.primary,

      placeholderColor: color.textSecondary,

      shadowColor: 'rgba(0,0,0,0.1)',
      shadowColorHover: 'rgba(0,0,0,0.15)',
      shadowColorPress: 'rgba(0,0,0,0.05)',
      shadowColorFocus: 'rgba(0,0,0,0.15)',
      elevationShadowColor: 'rgba(0,0,0,0.2)',

      primaryButtonBackground: color.white,
      primaryButtonBackgroundHover: 'rgba(255, 255, 255, 0.9)',
      primaryButtonBackgroundPress: 'rgba(255, 255, 255, 0.8)',
      primaryButtonColor: color.primary,
      secondaryButtonBackground: 'rgba(255, 255, 255, 0.2)',
      secondaryButtonBackgroundHover: 'rgba(255, 255, 255, 0.3)',
      secondaryButtonBackgroundPress: 'rgba(255, 255, 255, 0.15)',
      secondaryButtonColor: color.white,
    },

    dark: {
      background: color.backgroundDark,
      backgroundHover: color.surfaceDark,
      backgroundPress: color.borderDark,
      backgroundFocus: color.surfaceDark,
      backgroundTransparent: color.transparent,
      backgroundOverlay: color.overlay,

      color: color.textDark,
      colorHover: color.textDark,
      colorPress: color.textSecondaryDark,
      colorFocus: color.textDark,
      colorTransparent: color.transparent,
      // Soft text — between primary text and muted; for secondary labels
      colorSoft: color.textSoftDark ?? color.textSoft,
      // Dim text — below secondary; for tertiary/helper labels
      colorDim: color.textDimDark ?? color.textDim,

      borderColor: color.borderDark,
      borderColorHover: color.primary,
      borderColorPress: color.primaryDark,
      borderColorFocus: color.primary,

      placeholderColor: color.textSecondaryDark,

      shadowColor: 'rgba(0,0,0,0.3)',
      shadowColorHover: 'rgba(0,0,0,0.4)',
      shadowColorPress: 'rgba(0,0,0,0.2)',
      shadowColorFocus: 'rgba(0,0,0,0.4)',
      elevationShadowColor: 'rgba(0,0,0,0.5)',
    },

    light_Button: {
      background: color.primary,
      backgroundHover: color.primaryDark,
      backgroundPress: color.primaryDark,
      backgroundFocus: color.primaryDark,
      backgroundTransparent: color.transparent,
      color: color.white,
      textColor: color.white,
      colorHover: color.white,
      colorPress: color.white,
      colorFocus: color.white,
      colorTransparent: color.transparent,
      borderColor: color.transparent,
      borderColorHover: color.transparent,
      borderColorPress: color.transparent,
      borderColorFocus: color.primary,
      placeholderColor: color.white,
      shadowColor: 'rgba(0,174,255,0.3)',
      shadowColorHover: 'rgba(0,174,255,0.4)',
      shadowColorPress: 'rgba(0,174,255,0.2)',
      shadowColorFocus: 'rgba(0,174,255,0.4)',
    },

    light_Card: {
      background: color.white,
      backgroundHover: color.surface,
      backgroundPress: color.surface,
      backgroundFocus: color.surface,
      backgroundTransparent: color.transparent,
      color: color.text,
      colorHover: color.text,
      colorPress: color.textSecondary,
      colorFocus: color.text,
      colorTransparent: color.transparent,
      borderColor: color.border,
      borderColorHover: color.border,
      borderColorPress: color.border,
      borderColorFocus: color.primary,
      placeholderColor: color.textSecondary,
      shadowColor: 'rgba(0,0,0,0.08)',
      shadowColorHover: 'rgba(0,0,0,0.12)',
      shadowColorPress: 'rgba(0,0,0,0.04)',
      shadowColorFocus: 'rgba(0,0,0,0.12)',
    },

    light_Input: {
      background: color.white,
      backgroundHover: color.white,
      backgroundPress: color.white,
      backgroundFocus: color.white,
      backgroundTransparent: color.transparent,
      color: color.text,
      colorHover: color.text,
      colorPress: color.text,
      colorFocus: color.text,
      colorTransparent: color.transparent,
      borderColor: color.border,
      borderColorHover: color.primary,
      borderColorPress: color.primaryDark,
      borderColorFocus: color.primary,
      placeholderColor: color.textSecondary,
      shadowColor: 'rgba(0,0,0,0.05)',
      shadowColorHover: 'rgba(0,174,255,0.1)',
      shadowColorPress: 'rgba(0,0,0,0.05)',
      shadowColorFocus: 'rgba(0,174,255,0.15)',
    },

    dark_Button: {
      background: color.primary,
      backgroundHover: color.primaryLight,
      backgroundPress: color.primaryDark,
      backgroundFocus: color.primaryLight,
      backgroundTransparent: color.transparent,
      color: color.white,
      textColor: color.white,
      colorHover: color.white,
      colorPress: color.white,
      colorFocus: color.white,
      colorTransparent: color.transparent,
      borderColor: color.transparent,
      borderColorHover: color.transparent,
      borderColorPress: color.transparent,
      borderColorFocus: color.primary,
      placeholderColor: color.white,
      shadowColor: 'rgba(0,174,255,0.2)',
      shadowColorHover: 'rgba(0,174,255,0.3)',
      shadowColorPress: 'rgba(0,174,255,0.1)',
      shadowColorFocus: 'rgba(0,174,255,0.3)',
    },

    dark_Card: {
      background: color.surfaceDark,
      backgroundHover: color.surfaceDark,
      backgroundPress: color.borderDark,
      backgroundFocus: color.surfaceDark,
      backgroundTransparent: color.transparent,
      color: color.textDark,
      colorHover: color.textDark,
      colorPress: color.textSecondaryDark,
      colorFocus: color.textDark,
      colorTransparent: color.transparent,
      borderColor: color.borderDark,
      borderColorHover: color.borderDark,
      borderColorPress: color.borderDark,
      borderColorFocus: color.primary,
      placeholderColor: color.textSecondaryDark,
      shadowColor: 'rgba(0,0,0,0.2)',
      shadowColorHover: 'rgba(0,0,0,0.3)',
      shadowColorPress: 'rgba(0,0,0,0.1)',
      shadowColorFocus: 'rgba(0,0,0,0.3)',
    },

    light_GlowCard: {
      background: color.surface,
      borderColor: color.primary,
      shadowColor: 'rgba(0,174,255,0.8)',
    },

    dark_GlowCard: {
      background: color.surfaceDark,
      borderColor: color.primary,
      shadowColor: 'rgba(0,174,255,0.8)',
    },

    dark_Input: {
      background: color.surfaceDark,
      backgroundHover: color.surfaceDark,
      backgroundPress: color.surfaceDark,
      backgroundFocus: color.surfaceDark,
      backgroundTransparent: color.transparent,
      color: color.textDark,
      colorHover: color.textDark,
      colorPress: color.textDark,
      colorFocus: color.textDark,
      colorTransparent: color.transparent,
      borderColor: color.borderDark,
      borderColorHover: color.primary,
      borderColorPress: color.primaryDark,
      borderColorFocus: color.primary,
      placeholderColor: color.textSecondaryDark,
      shadowColor: 'rgba(0,0,0,0.15)',
      shadowColorHover: 'rgba(0,174,255,0.08)',
      shadowColorPress: 'rgba(0,0,0,0.15)',
      shadowColorFocus: 'rgba(0,174,255,0.12)',
    },

    // Toast component theme — inherits from Card but scoped to notification context
    light_Toast: {
      background: color.surface ?? color.white,
      color: color.text,
      borderColor: color.border,
      shadowColor: 'rgba(0,0,0,0.12)',
    },
    dark_Toast: {
      background: color.surfaceDark,
      color: color.textDark,
      borderColor: color.borderDark,
      shadowColor: 'rgba(0,0,0,0.32)',
    },

    // Dialog component theme — modal overlay container
    light_Dialog: {
      background: color.surface ?? color.white,
      color: color.text,
      borderColor: color.border,
      shadowColor: 'rgba(0,0,0,0.16)',
    },
    dark_Dialog: {
      background: color.surfaceDark,
      color: color.textDark,
      borderColor: color.borderDark,
      shadowColor: 'rgba(0,0,0,0.4)',
    },
  }
}
