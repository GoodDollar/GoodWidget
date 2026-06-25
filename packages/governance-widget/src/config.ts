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
  },
} satisfies GoodWidgetConfig
