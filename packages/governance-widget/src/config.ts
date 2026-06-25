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
  borderColor: '#D0D9E4',
  borderColorHover: '#BDCAD6',
} satisfies Partial<GoodWidgetThemeValues>

const governanceDarkSurface = {
  background: '#1E1F26',
  backgroundHover: '#1E1F26',
  backgroundPress: '#333333',
  backgroundFocus: '#1E1F26',
  borderColor: '#4D4D4D',
  borderColorHover: '#666666',
} satisfies Partial<GoodWidgetThemeValues>

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
      background: '#EDF5FC',
      borderColor: '#D0D9E4',
    },
    dark_OnboardingAccentRow: {
      background: '#1E1F26',
      borderColor: '#4D4D4D',
    },

    light_OnboardingFieldRow: {
      background: '#EDF5FC',
    },
    dark_OnboardingFieldRow: {
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
      backgroundHover: '#1E1F26',
      backgroundPress: '#333333',
      borderColorFocus: '#1A85FF',
    },

    light_GovernanceRadioBullet: {
      background: '#FFFFFF',
      borderColor: '#D0D9E4',
    },
    dark_GovernanceRadioBullet: {
      background: '#13151C',
      borderColor: '#4D4D4D',
    },

    light_GovernanceRadioDot: {
      background: '#00B0FF',
    },
    dark_GovernanceRadioDot: {
      background: '#1A85FF',
    },

    light_GovernanceHousePill: {
      background: '#EDF5FC',
      borderColor: '#D0D9E4',
    },
    dark_GovernanceHousePill: {
      background: '#1E1F26',
      borderColor: '#4D4D4D',
    },

    // ----- Success / celebration -----
    light_OnboardingSuccessCard: {
      background: '#00B0FF',
    },
    dark_OnboardingSuccessCard: {
      background: '#1A85FF',
    },

    light_OnboardingCelebrationIcon: {
      background: '#EDF5FC',
      borderColor: '#BDCAD6',
    },
    dark_OnboardingCelebrationIcon: {
      background: '#1E1F26',
      borderColor: '#666666',
    },
  },
} satisfies GoodWidgetConfig
