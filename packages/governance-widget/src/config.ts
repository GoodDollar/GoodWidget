import type { GoodWidgetConfig } from '@goodwidget/ui'
import type { GoodWidgetThemeValues } from '@goodwidget/ui'

// ---------------------------------------------------------------------------
// Shared surface shapes — reuse across component themes to keep values DRY
// and to make future token-aligned migrations easier to diff.
// ---------------------------------------------------------------------------

const governanceLightSurface = {
  background: '#FFFFFF',
  backgroundHover: '#EDF5FC',
  backgroundPress: '#EDF5FC',
  backgroundFocus: '#EDF5FC',
  color: '#0D182D',
  colorHover: '#0D182D',
  colorPress: '#434B59',
  colorFocus: '#0D182D',
  colorSoft: '#4F606F',
  colorDim: '#4F606F',
  primary: '#00B0FF',
  success: '#13C636',
  warning: '#FFB020',
  error: '#F00505',
  borderColor: '#D0D9E4',
  borderColorHover: 'rgba(0, 176, 255, 0.12)',
  borderColorPress: '#8DCDFF',
  borderColorFocus: '#00B0FF',
  placeholderColor: '#4F606F',
  shadowColor: 'rgba(0, 176, 255, 0.14)',
  shadowColorHover: 'rgba(0, 176, 255, 0.1)',
  shadowColorPress: 'rgba(0, 176, 255, 0.04)',
  shadowColorFocus: 'rgba(0, 176, 255, 0.1)',
} satisfies GoodWidgetThemeValues

const governanceDarkSurface = {
  background: '#1E1F26',
  backgroundHover: '#333333',
  backgroundPress: '#333333',
  backgroundFocus: '#1E1F26',
  color: '#FFFFFF',
  colorHover: '#FFFFFF',
  colorPress: '#808080',
  colorFocus: '#FFFFFF',
  colorSoft: '#CCC',
  colorDim: '#4B5563',
  primary: '#1A85FF',
  success: '#13C636',
  warning: '#FFB020',
  error: '#F00505',
  borderColor: '#4D4D4D',
  borderColorHover: '#666666',
  borderColorPress: '#666666',
  borderColorFocus: '#1A85FF',
  placeholderColor: '#808080',
  shadowColor: 'rgba(3, 7, 18, 0.68)',
  shadowColorHover: 'rgba(3, 7, 18, 0.82)',
  shadowColorPress: 'rgba(3, 7, 18, 0.58)',
  shadowColorFocus: 'rgba(3, 7, 18, 0.82)',
} satisfies GoodWidgetThemeValues

/**
 * Governance widget component-level theme overrides.
 *
 * These are kept local to the governance-widget package so that:
 *  - @goodwidget/ui remains widget-agnostic
 *  - integrators can narrow or override them via GovernanceWidgetProvider's
 *    themeOverrides prop without touching the shared preset
 *
 * Pattern: PR #54 — GovernanceWidgetProvider merges these at the author-config
 * layer through mergeOverrideMaps before handing off to GoodWidgetProvider.
 */
export const governanceWidgetConfig = {
  themes: {
    // ----- Onboarding layout rows -----
    light_OnboardingAccentRow: {
      ...governanceLightSurface,
      background: '#EDF5FC',
      borderColor: '#D0D9E4',
    },
    dark_OnboardingAccentRow: {
      ...governanceDarkSurface,
      background: '#1E1F26',
      borderColor: '#4D4D4D',
    },

    light_OnboardingFieldRow: {
      ...governanceLightSurface,
      background: '#EDF5FC',
    },
    dark_OnboardingFieldRow: {
      ...governanceDarkSurface,
      background: '#1E1F26',
    },

    // ----- House selection -----
    light_GovernanceHouseOptionButton: {
      ...governanceLightSurface,
      backgroundHover: '#EDF5FC',
      backgroundPress: '#EDF5FC',
      borderColorFocus: '#00B0FF',
    },
    dark_GovernanceHouseOptionButton: {
      ...governanceDarkSurface,
      backgroundHover: '#333333',
      backgroundPress: '#333333',
      borderColorFocus: '#1A85FF',
    },

    light_GovernanceRadioBullet: {
      ...governanceLightSurface,
      background: '#FFFFFF',
      borderColor: '#D0D9E4',
    },
    dark_GovernanceRadioBullet: {
      ...governanceDarkSurface,
      background: '#13151C',
      borderColor: '#4D4D4D',
    },

    light_GovernanceRadioDot: {
      ...governanceLightSurface,
      background: '#00B0FF',
    },
    dark_GovernanceRadioDot: {
      ...governanceDarkSurface,
      background: '#1A85FF',
    },

    light_GovernanceHousePill: {
      ...governanceLightSurface,
      background: '#EDF5FC',
      borderColor: '#D0D9E4',
    },
    dark_GovernanceHousePill: {
      ...governanceDarkSurface,
      background: '#1E1F26',
      borderColor: '#4D4D4D',
    },

    // ----- Success / celebration -----
    light_OnboardingSuccessCard: {
      ...governanceLightSurface,
      background: '#00B0FF',
      color: '#FFFFFF',
      colorHover: '#FFFFFF',
      colorPress: '#FFFFFF',
      colorFocus: '#FFFFFF',
      primaryButtonBackground: '#FFFFFF',
      primaryButtonBackgroundHover: 'rgba(255, 255, 255, 0.9)',
      primaryButtonBackgroundPress: 'rgba(255, 255, 255, 0.8)',
      primaryButtonColor: '#00B0FF',
      secondaryButtonBackground: 'rgba(255, 255, 255, 0.2)',
      secondaryButtonBackgroundHover: 'rgba(255, 255, 255, 0.3)',
      secondaryButtonBackgroundPress: 'rgba(255, 255, 255, 0.15)',
      secondaryButtonColor: '#FFFFFF',
    },
    dark_OnboardingSuccessCard: {
      ...governanceDarkSurface,
      background: '#1A85FF',
      color: '#FFFFFF',
      colorHover: '#FFFFFF',
      colorPress: '#FFFFFF',
      colorFocus: '#FFFFFF',
      primaryButtonBackground: '#FFFFFF',
      primaryButtonBackgroundHover: 'rgba(255, 255, 255, 0.9)',
      primaryButtonBackgroundPress: 'rgba(255, 255, 255, 0.8)',
      primaryButtonColor: '#1A85FF',
      secondaryButtonBackground: 'rgba(255, 255, 255, 0.2)',
      secondaryButtonBackgroundHover: 'rgba(255, 255, 255, 0.3)',
      secondaryButtonBackgroundPress: 'rgba(255, 255, 255, 0.15)',
      secondaryButtonColor: '#FFFFFF',
    },

    light_OnboardingCelebrationIcon: {
      ...governanceLightSurface,
      background: 'rgba(255, 255, 255, 0.2)',
      borderColor: 'transparent',
    },
    dark_OnboardingCelebrationIcon: {
      ...governanceDarkSurface,
      background: 'rgba(255, 255, 255, 0.2)',
      borderColor: 'transparent',
    },

    // ----- Base Theme and Standard UI Component Overrides -----
    light: {
      background: '#F8F9FB',
      backgroundHover: '#EDF5FC',
      backgroundPress: '#EDF5FC',
      backgroundFocus: '#EDF5FC',
      backgroundDark: '#FFFFFF',
      backgroundDarkHover: '#EDF5FC',
      backgroundTransparent: 'transparent',
      backgroundOverlay: 'rgba(13, 24, 45, 0.48)',
      color: '#0D182D',
      colorHover: '#0D182D',
      colorPress: '#434B59',
      colorFocus: '#0D182D',
      colorTransparent: 'transparent',
      colorSoft: '#8F9BB3',
      colorDim: '#4F606F',
      text: '#0D182D',
      primary: '#00B0FF',
      primaryDark: '#006493',
      primaryLight: '#8DCDFF',
      secondary: '#1FC2AF',
      success: '#13C636',
      warning: '#FFB020',
      error: '#F00505',
      info: '#00B0FF',
      secondaryColor: '#4F606F',
      successMuted: 'rgba(19, 198, 54, 0.14)',
      errorMuted: 'rgba(240, 5, 5, 0.14)',
      warningMuted: 'rgba(255, 176, 32, 0.18)',
      infoMuted: 'rgba(0, 176, 255, 0.12)',
      borderColor: '#D0D9E4',
      borderColorHover: '#BDCAD6',
      borderColorPress: '#8DCDFF',
      borderColorFocus: '#00B0FF',
      textColor: '#0D182D',
      placeholderColor: '#4F606F',
      shadowColor: 'rgba(0, 176, 255, 0.06)',
      shadowColorHover: 'rgba(0, 176, 255, 0.1)',
      shadowColorPress: 'rgba(0, 176, 255, 0.04)',
      shadowColorFocus: 'rgba(0, 176, 255, 0.1)',
      elevationShadowColor: 'rgba(0, 176, 255, 0.14)',
    },
    light_Card: {
      background: '#FFFFFF',
      color: '#0D182D',
      borderColor: '#D0D9E4',
      shadowColor: 'rgba(0, 176, 255, 0.1)',
    },
    light_GlowCard: {
      background: '#EDF5FC',
      color: '#0D182D',
      borderColor: '#00B0FF',
      shadowColor: 'rgba(0, 176, 255, 0.3)',
    },
    light_Button: {
      background: '#00B0FF',
      backgroundHover: '#00B0FF',
      backgroundPress: '#006493',
      backgroundFocus: '#00B0FF',
      color: '#FFFFFF',
      borderColor: '#00B0FF',
      borderColorFocus: '#8DCDFF',
      shadowColor: 'rgba(0, 176, 255, 0.3)',
    },
    light_Input: {
      background: '#FFFFFF',
      color: '#0D182D',
      borderColor: '#D0D9E4',
      borderColorHover: '#BDCAD6',
      borderColorFocus: '#00B0FF',
      placeholderColor: '#4F606F',
      shadowColorFocus: 'rgba(0, 176, 255, 0.14)',
    },
    light_ProfileTextAreaField: {
      background: '#FFFFFF',
      color: '#0D182D',
      borderColor: '#D0D9E4',
      borderColorHover: '#BDCAD6',
      borderColorFocus: '#00B0FF',
      placeholderColor: '#4F606F',
      shadowColorFocus: 'rgba(0, 176, 255, 0.14)',
    },
    light_ClaimCard: {
      background: '#FFFFFF',
      borderColor: '#D0D9E4',
      shadowColor: 'rgba(0, 176, 255, 0.1)',
    },
    light_StreakCard: {
      background: '#EDF5FC',
      borderColor: '#D0D9E4',
      shadowColor: 'rgba(0, 176, 255, 0.06)',
    },
    light_ClaimActionButton: {
      background: 'transparent',
      backgroundHover: 'rgba(0, 176, 255, 0.16)',
      backgroundPress: 'rgba(0, 176, 255, 0.16)',
      backgroundFocus: 'rgba(0, 176, 255, 0.16)',
      color: '#006493',
      borderColor: '#00B0FF',
      borderColorFocus: '#00B0FF',
      shadowColor: 'rgba(0, 176, 255, 0.3)',
    },
    light_ClaimActionGlow: {
      backgroundColor: 'rgba(0, 176, 255, 0.3)',
      opacity: '0.08',
      glowOffset: '-4px',
    },
    light_TokenAmountText: {
      color: '#0D182D',
      secondaryColor: '#4F606F',
    },
    light_Toast: {
      background: '#FFFFFF',
      color: '#0D182D',
      borderColor: '#D0D9E4',
      shadowColor: 'rgba(0, 176, 255, 0.14)',
    },
    light_Dialog: {
      background: '#FFFFFF',
      color: '#0D182D',
      borderColor: '#D0D9E4',
      shadowColor: 'rgba(0, 176, 255, 0.14)',
    },
  },
} satisfies GoodWidgetConfig
