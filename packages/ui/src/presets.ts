import type { WidgetDesignPreset } from './configTypes'

// Our base level token set is mapped directly from the GoodWalletV2 design tokens,
// which are the source of truth for all design values used in the GoodWalletV2 app.
// These should be used as the basis for all themes and component themes,
// and only in rare cases should a new value be added that isn't derived from these tokens.
const tokenPreset = {
  tokens: {
    color: {
      white: '#FFFFFF',
      black: '#000000',
      grey100: '#F5F7FA',
      grey300: '#C4CAD3',
      grey350: '#CCC',
      grey400: '#9AA5B4',
      grey500: '#7A8594',
      grey600: '#4B5563',
      grey700: '#434B59',
      grey800: '#2A3040',
      grey900: '#171C2B',

      blue: '#1A85FF',
      purple: '#6933FF',
      green: '#13C636',
      cyan: '#C5EDF8',
      teal: '#0F766E',
      red: '#F00505',
      orange: '#FFB020',

      primary: '#1A85FF',
      primaryDark: '#0068DF',
      primaryLight: '#1A85FF',
      secondary: '#1A85FF',
      success: '#13C636',
      warning: '#FFB020',
      error: '#F00505',
      info: '#1A85FF',

      primaryMuted: 'rgba(26, 133, 255, 0.3)',
      successMuted: 'rgba(19, 198, 54, 0.15)',
      errorMuted: 'rgba(240, 5, 5, 0.15)',
      warningMuted: 'rgba(255, 176, 32, 0.18)',
      infoMuted: 'rgba(26, 133, 255, 0.20)',

      background: '#13151C',
      backgroundDark: '#13151C',
      surface: '#1E1F26',
      surfaceDark: '#1E1F26',
      text: '#FFFFFF',
      textDark: '#FFFFFF',
      textSecondary: '#808080',
      textSecondaryDark: '#808080',
      border: '#4D4D4D',
      borderDark: '#4D4D4D',
      overlay: 'rgba(19, 21, 28, 0.8)',
      transparent: 'transparent',

      backgroundRaised: '#1E1F26',
      backgroundInput: '#333333',
      backgroundOverlay: 'rgba(19, 21, 28, 0.8)',
      borderLight: '#666666',
      glowPrimary: 'rgba(26, 133, 255, 0.82)',
      glowSuccess: 'rgba(19, 198, 54, 0.72)',
      glowError: 'rgba(240, 5, 5, 0.72)',
      shimmer: 'rgba(245, 249, 255, 0.22)',


    },
    space: {
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
      7: 28,
      8: 32,
      9: 40,
      10: 48,
      true: 16,
    },
    radius: {
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
      true: 12,
      full: 9999,
    },
    size: {
      1: 12,
      2: 14,
      3: 16,
      4: 20,
      5: 24,
      6: 32,
      7: 40,
      8: 48,
      9: 56,
      10: 64,
      11: 72,
      12: 80,
      14: 96,
      true: 40,
      maxContentWidth: 768,
      icon2xs: 12,
      iconXs: 16,
      iconSm: 20,
      iconMd: 24,
      iconLg: 32,
      iconXl: 48,
      icon2xl: 64,
    },
    zIndex: {
      0: 0,
      1: 10,
      2: 50,
      3: 100,
      4: 200,
      5: 300,
    },
  },
}

const color = tokenPreset.tokens.color
// GoodWalletV2 baseline preset wired directly into the native GoodWidget
// tokens -> themes -> createTamagui pipeline.
// Tokens: should be highest level of primitives for pallette, spacing, colors.

// Themes: should map these primitives to semantic roles
// (e.g. "primaryButtonBackground", "cardBackground", etcolor.) for light/dark modes and component-specific overrides.

// Component themes: should map semantic roles to specific components (e.g. "Button", "Card", etcolor.)
// for targeted overrides of specific components within the manifest/host override chain.

// lower-level component-themes should use as much as possible existing themes and only for
// edge-cases or very specific designs should/can it be that they get a hardcoded hex color or value that isn't derived from the theme.
// as soon as these values get repeated across components it should be looked to bubble it up to theme or tokens.
//
// REVIEW NOTE:
// This preset now carries standard widget-agnostic design system defaults:
// - `light` / `light_*`: generic light-mode tokens and component-specific presets
// - `dark` / `dark_*`: generic dark-mode tokens and component-specific presets
//
// All widget-specific theme overrides (such as for the governance onboarding widget)
// have been successfully migrated out to widget-local configurations.

export const goodWalletV2Preset: WidgetDesignPreset = {
  id: 'goodwallet-v2',
  version: '1.1.0',
  tokens: tokenPreset.tokens,
  themes: {
    light: {
      background: color.white,
      backgroundHover: color.grey100,
      backgroundPress: color.grey300,
      backgroundFocus: color.grey100,
      backgroundTransparent: color.transparent,
      backgroundOverlay: 'rgba(255, 255, 255, 0.8)',

      color: color.grey900,
      colorHover: color.grey900,
      colorPress: color.grey800,
      colorFocus: color.grey900,
      colorTransparent: color.transparent,
      colorSoft: color.grey500,
      colorDim: color.grey600,
      text: color.grey900,
      primary: color.primary,
      primaryDark: color.primaryDark,
      primaryLight: color.primaryLight,
      secondary: color.secondary,
      success: color.success,
      warning: color.warning,
      error: color.error,
      info: color.info,
      secondaryColor: color.grey500,
      successMuted: color.successMuted,
      errorMuted: color.errorMuted,
      warningMuted: color.warningMuted,
      infoMuted: color.infoMuted,

      borderColor: color.grey300,
      borderColorHover: color.grey400,
      borderColorPress: color.grey400,
      borderColorFocus: color.primary,

      textColor: color.grey900,
      placeholderColor: color.grey400,

      shadowColor: 'rgba(0, 0, 0, 0.08)',
      shadowColorHover: 'rgba(0, 0, 0, 0.12)',
      shadowColorPress: 'rgba(0, 0, 0, 0.06)',
      shadowColorFocus: 'rgba(0, 0, 0, 0.12)',
      elevationShadowColor: 'rgba(0, 0, 0, 0.15)',
    },

    light_Card: {
      background: color.white,
      color: color.grey900,
      borderColor: color.grey300,
      shadowColor: 'rgba(0, 0, 0, 0.08)',
    },

    light_GlowCard: {
      background: color.white,
      color: color.grey900,
      borderColor: color.primary,
      shadowColor: color.glowPrimary,
    },

    light_Button: {
      background: color.primary,
      backgroundHover: color.primaryLight,
      backgroundPress: color.primaryDark,
      backgroundFocus: color.primaryLight,
      color: color.white,
      textColor: color.white,
      borderColor: color.primary,
      borderColorFocus: color.primaryLight,
      shadowColor: color.glowPrimary,
    },

    light_Input: {
      background: color.white,
      color: color.grey900,
      borderColor: color.grey300,
      borderColorHover: color.grey400,
      borderColorFocus: color.primary,
      placeholderColor: color.grey500,
      shadowColorFocus: 'rgba(0, 0, 0, 0.08)',
    },


    light_Toast: {
      background: color.white,
      color: color.grey900,
      borderColor: color.grey300,
      shadowColor: 'rgba(0, 0, 0, 0.15)',
    },

    light_Dialog: {
      background: color.white,
      color: color.grey900,
      borderColor: color.grey300,
      shadowColor: 'rgba(0, 0, 0, 0.15)',
    },

    light_ClaimCard: {
      background: color.white,
      borderColor: color.grey300,
      shadowColor: 'rgba(0, 0, 0, 0.12)',
    },

    light_StreakCard: {
      background: color.grey100,
      borderColor: color.grey300,
      shadowColor: 'rgba(0, 0, 0, 0.08)',
    },

    light_ClaimActionButton: {
      background: color.transparent,
      backgroundHover: color.primaryMuted,
      backgroundPress: color.primaryMuted,
      backgroundFocus: color.primaryMuted,
      color: color.primaryDark,
      borderColor: color.primary,
      borderColorFocus: color.primary,
      shadowColor: color.glowPrimary,
    },

    light_ClaimActionGlow: {
      backgroundColor: color.glowPrimary,
      opacity: '0.08',
      glowOffset: '-4px',
    },

    light_TokenAmountText: {
      color: color.grey900,
      secondaryColor: color.grey500,
    },

    // Legacy GoodWalletV2 dark-mode branch.
    dark: {
      background: color.backgroundDark,
      backgroundHover: color.surfaceDark,
      backgroundPress: color.backgroundInput,
      backgroundFocus: color.surfaceDark,
      backgroundTransparent: color.transparent,
      backgroundOverlay: color.backgroundOverlay,

      color: color.textDark,
      colorHover: color.textDark,
      colorPress: color.textDark,
      colorFocus: color.textDark,
      colorTransparent: color.transparent,
      // GoodWalletV2 is dark-only; soft/dim text must remain readable against
      // the dark background (#13151C). grey350 (#CCC) and grey600 (#4B5563)
      // provide the correct contrast levels for soft and dim content respectively.
      colorSoft: color.grey350,
      colorDim: color.grey600,
      text: color.textDark,
      primary: color.primary,
      primaryDark: color.primaryDark,
      primaryLight: color.primaryLight,
      secondary: color.secondary,
      success: color.success,
      warning: color.warning,
      error: color.error,
      info: color.info,
      secondaryColor: color.textSecondaryDark,
      successMuted: color.successMuted,
      errorMuted: color.errorMuted,
      warningMuted: color.warningMuted,
      infoMuted: color.infoMuted,

      borderColor: color.borderDark,
      borderColorHover: color.borderLight,
      borderColorPress: color.borderLight,
      borderColorFocus: color.primary,

      textColor: color.text,
      placeholderColor: color.textSecondaryDark,

      shadowColor: 'rgba(3, 7, 18, 0.72)',
      shadowColorHover: 'rgba(3, 7, 18, 0.82)',
      shadowColorPress: 'rgba(3, 7, 18, 0.58)',
      shadowColorFocus: 'rgba(3, 7, 18, 0.82)',
      elevationShadowColor: 'rgba(3, 7, 18, 0.9)',
    },


    dark_Card: {
      background: color.surfaceDark,
      color: color.textDark,
      borderColor: color.borderDark,
      shadowColor: 'rgba(3, 7, 18, 0.68)',
    },


    dark_GlowCard: {
      background: color.surfaceDark,
      color: color.textDark,
      borderColor: color.primary,
      shadowColor: 'rgba(26, 133, 255, 0.9)',
    },


    dark_Button: {
      background: color.primary,
      backgroundHover: color.primaryLight,
      backgroundPress: color.primaryDark,
      backgroundFocus: color.primaryLight,
      color: color.white,
      textColor: color.white,
      borderColor: color.primary,
      borderColorFocus: color.primaryLight,
      shadowColor: 'rgba(26, 133, 255, 0.8)',
    },


    dark_Input: {
      background: color.backgroundInput,
      color: color.textDark,
      borderColor: color.borderDark,
      borderColorHover: color.borderLight,
      borderColorFocus: color.primary,
      placeholderColor: color.textSecondaryDark,
    },




    dark_ClaimCard: {
      background: color.backgroundDark,
      borderColor: color.borderDark,
      shadowColor: 'rgba(3, 7, 18, 0.9)',
    },

    dark_StreakCard: {
      background: color.surfaceDark,
      borderColor: color.borderDark,
      shadowColor: 'rgba(3, 7, 18, 0.64)',
    },

    dark_ClaimActionGlow: {
      backgroundColor: color.primary,
      glowOpacity: '0.45',
      glowOffset: '-16px',
    },
    dark_ClaimActionButton: {
      background: color.transparent,
      backgroundHover: 'rgba(26, 133, 255, 0.06)',
      backgroundPress: 'rgba(26, 133, 255, 0.2)',
      backgroundFocus: 'rgba(26, 133, 255, 0.06)',
      color: color.primary,
      borderColor: color.primary,
      borderColorFocus: color.primary,
      shadowColor: 'rgba(26, 133, 255, 0.9)',
    },




    dark_Toast: {
      background: color.surface,
      color: color.white,
      borderColor: color.border,
      shadowColor: 'rgba(3, 7, 18, 0.6)',
    },

    // Dialog — modal container surface

    dark_Dialog: {
      background: color.backgroundRaised,
      color: color.white,
      borderColor: color.border,
      shadowColor: 'rgba(3, 7, 18, 0.8)',
    },
  },
  typography: {
    // Typography is still preset-scoped rather than theme-scoped.
    // We are intentionally keeping the existing GoodWalletV2 font contract here
    // during the merge pass. A later pass can decide whether the unified preset
    // should keep one shared typography system or split it differently.
    body: {
      family: 'Avenir Next, Inter, system-ui, -apple-system, sans-serif',
      size: {
        1: 12,
        2: 14,
        3: 16,
        4: 18,
        5: 20,
        true: 16,
      },
      lineHeight: {
        1: 16,
        2: 20,
        3: 24,
        4: 26,
        5: 30,
        6: 36,
        7: 44,
        true: 24,
      },
      weight: {
        1: '400',
        2: '400',
        3: '400',
        4: '500',
        5: '600',
        6: '700',
        7: '700',
        8: '800',
        true: '400',
      },
      letterSpacing: {
        1: 0,
        2: 0,
        3: 0,
        4: -0.1,
        5: -0.2,
        6: -0.4,
        7: -0.8,
        8: -1,
        true: 0,
      },
    },
    heading: {
      family: 'Avenir Next, Inter, system-ui, -apple-system, sans-serif',
      size: {
        3: 17,
        4: 21,
        5: 26,
        6: 34,
        7: 42,
        8: 50,
        9: 56,
        10: 64,
        true: 17,
      },
      lineHeight: {
        3: 22,
        4: 28,
        5: 32,
        6: 40,
        7: 48,
        8: 56,
        9: 62,
        10: 70,
        true: 24,
      },
      weight: {
        3: '600',
        4: '700',
        5: '700',
        6: '700',
        7: '700',
        8: '800',
        9: '800',
        10: '800',
        true: '600',
      },
      letterSpacing: {
        3: -0.2,
        4: -0.3,
        5: -0.5,
        6: -0.8,
        7: -1,
        8: -1.2,
        9: -1.3,
        10: -1.4,
        true: -0.2,
      },
    },
  },
  animations: {
    quick: { type: 'timing', duration: 150 },
    medium: { type: 'timing', duration: 300 },
    slow: { type: 'timing', duration: 500 },
    exit: { type: 'timing', duration: 150 },
  },
}
