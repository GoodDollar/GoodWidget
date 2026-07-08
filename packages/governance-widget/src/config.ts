import type { GoodWidgetConfig } from '@goodwidget/core'
import { defaultTokenPreset, mergeOverrideMaps } from '@goodwidget/ui'

const color = defaultTokenPreset.tokens.color

const governanceTokenPreset = {
  impactOverlay: 'rgba(255, 255, 255, 0.12)',
  impactOverlayPressed: 'rgba(255, 255, 255, 0.08)',
  impactOverlayStrong: 'rgba(255, 255, 255, 0.18)',
  impactTextSoft: 'rgba(255, 255, 255, 0.88)',
  impactTextDim: 'rgba(255, 255, 255, 0.92)',
  impactBorder: 'rgba(255, 255, 255, 0.12)',
  impactBorderHover: 'rgba(255, 255, 255, 0.20)',
  impactBorderFocus: 'rgba(255, 255, 255, 0.24)',
} as const

const transparentTheme = {
  borderColor: color.transparent,
  borderColorHover: color.transparent,
  borderColorPress: color.transparent,
  borderColorFocus: color.transparent,
  shadowColor: color.transparent,
  shadowColorHover: color.transparent,
  shadowColorPress: color.transparent,
  shadowColorFocus: color.transparent,
} as const

const successCardSecondaryButtonTheme = {
  background: 'rgba(255, 255, 255, 0.2)',
  backgroundHover: 'rgba(255, 255, 255, 0.3)',
  backgroundPress: 'rgba(255, 255, 255, 0.15)',
  backgroundFocus: 'rgba(255, 255, 255, 0.3)',
  color: color.white,
  textColor: color.white,
  colorHover: color.white,
  colorPress: color.white,
  colorFocus: color.white,
  ...transparentTheme,
} as const

const lightOnboardingSurface = {
  background: color.governanceSurfaceAlt,
  backgroundHover: color.governanceSurfaceAlt,
  backgroundPress: color.governanceSurfaceAlt,
  backgroundFocus: color.governanceSurfaceAlt,
  color: color.governanceText,
  textColor: color.governanceText,
  colorHover: color.governanceText,
  colorPress: color.grey700,
  colorFocus: color.governanceText,
  colorSoft: color.governanceTextSecondary,
  colorDim: color.governanceTextDim,
  primary: color.governancePrimary,
  success: color.success,
  warning: color.warning,
  error: color.error,
  borderColor: color.governanceBorder,
  borderColorHover: color.governanceBorderLight,
  borderColorPress: color.governancePrimaryLight,
  borderColorFocus: color.governancePrimary,
  placeholderColor: color.governanceTextSecondary,
  shadowColor: color.governanceElevationShadow,
  shadowColorHover: color.governanceShadowHover,
  shadowColorPress: color.governanceShadowPress,
  shadowColorFocus: color.governanceShadowHover,
} as const

const darkOnboardingSurface = {
  background: color.surfaceAlt,
  backgroundHover: color.backgroundInput,
  backgroundPress: color.backgroundInput,
  backgroundFocus: color.surfaceAlt,
  color: color.textDark,
  textColor: color.textDark,
  colorHover: color.textDark,
  colorPress: color.textSecondaryDark,
  colorFocus: color.textDark,
  colorSoft: color.grey350,
  colorDim: color.grey600,
  primary: color.primary,
  success: color.success,
  warning: color.warning,
  error: color.error,
  borderColor: color.borderDark,
  borderColorHover: color.borderLight,
  borderColorPress: color.borderLight,
  borderColorFocus: color.primary,
  placeholderColor: color.textSecondaryDark,
  shadowColor: 'rgba(3, 7, 18, 0.68)',
  shadowColorHover: 'rgba(3, 7, 18, 0.82)',
  shadowColorPress: 'rgba(3, 7, 18, 0.58)',
  shadowColorFocus: 'rgba(3, 7, 18, 0.82)',
} as const

export const governanceSurfaceTheme = {
  backgroundColor: '$background',
  borderColor: '$borderColor',
  color: '$color',
  shadowColor: '$shadowColor',
} as const

const governanceImpactTheme = {
  governanceImpactOverlay: governanceTokenPreset.impactOverlay,
  governanceImpactOverlayPressed: governanceTokenPreset.impactOverlayPressed,
  governanceImpactOverlayStrong: governanceTokenPreset.impactOverlayStrong,
  governanceImpactTextSoft: governanceTokenPreset.impactTextSoft,
  governanceImpactTextDim: governanceTokenPreset.impactTextDim,
  governanceImpactBorder: governanceTokenPreset.impactBorder,
  governanceImpactBorderHover: governanceTokenPreset.impactBorderHover,
  governanceImpactBorderFocus: governanceTokenPreset.impactBorderFocus,
} as const

/**
 * Governance-local author defaults.
 *
 * Shared preset values stay in @goodwidget/ui. This config only adds widget
 * semantics and component-level themes that governance components cannot inherit
 * from the shared preset.
 */
export const governanceWidgetConfig = {
  themes: {
    light: governanceImpactTheme,
    dark: governanceImpactTheme,

    light_GovernanceWrapper: {
      background: color.governanceSurface,
    },
    dark_GovernanceWrapper: {
      background: color.surfaceAlt,
    },
    light_ImpactCard: {
      background: color.governancePrimary,
      shadowColor: color.governanceElevationShadow,
    },
    dark_ImpactCard: {
      background: color.primary,
      shadowColor: 'rgba(3, 7, 18, 0.9)',
    },

    light_OnboardingAccentRow: lightOnboardingSurface,
    dark_OnboardingAccentRow: darkOnboardingSurface,
    light_OnboardingFieldRow: lightOnboardingSurface,
    dark_OnboardingFieldRow: darkOnboardingSurface,

    light_GovernanceHouseOptionButton: {
      background: color.governanceSurface,
      backgroundHover: color.governanceSurfaceAlt,
      backgroundPress: color.governanceSurfaceAlt,
      borderColorFocus: color.governancePrimary,
    },
    dark_GovernanceHouseOptionButton: {
      background: color.surfaceAlt,
      backgroundHover: color.backgroundInput,
      backgroundPress: color.backgroundInput,
      borderColorFocus: color.primary,
    },
    light_GovernanceRadioBullet: {
      background: color.governanceSurface,
      borderColor: color.governanceBorder,
    },
    dark_GovernanceRadioBullet: {
      background: color.backgroundDark,
      borderColor: color.borderDark,
    },
    light_GovernanceRadioDot: {
      background: color.governancePrimary,
    },
    dark_GovernanceRadioDot: {
      background: color.primary,
    },
    light_GovernanceHousePill: lightOnboardingSurface,
    dark_GovernanceHousePill: darkOnboardingSurface,

    light_OnboardingSuccessCard: {
      background: color.governancePrimary,
      color: color.white,
      colorHover: color.white,
      colorPress: color.white,
      colorFocus: color.white,
    },
    dark_OnboardingSuccessCard: {
      background: color.primary,
      color: color.white,
      colorHover: color.white,
      colorPress: color.white,
      colorFocus: color.white,
    },
    light_OnboardingCelebrationIcon: {
      background: 'rgba(255, 255, 255, 0.2)',
      borderColor: color.transparent,
    },
    dark_OnboardingCelebrationIcon: {
      background: 'rgba(255, 255, 255, 0.2)',
      borderColor: color.transparent,
    },

    light_OnboardingSuccessCardPrimary_Button: {
      background: color.white,
      backgroundHover: 'rgba(255, 255, 255, 0.9)',
      backgroundPress: 'rgba(255, 255, 255, 0.8)',
      backgroundFocus: 'rgba(255, 255, 255, 0.9)',
      color: color.governancePrimary,
      textColor: color.governancePrimary,
      colorHover: color.governancePrimary,
      colorPress: color.governancePrimary,
      colorFocus: color.governancePrimary,
      ...transparentTheme,
    },
    dark_OnboardingSuccessCardPrimary_Button: {
      background: color.white,
      backgroundHover: 'rgba(255, 255, 255, 0.9)',
      backgroundPress: 'rgba(255, 255, 255, 0.8)',
      backgroundFocus: 'rgba(255, 255, 255, 0.9)',
      color: color.primary,
      textColor: color.primary,
      colorHover: color.primary,
      colorPress: color.primary,
      colorFocus: color.primary,
      ...transparentTheme,
    },
    light_OnboardingSuccessCardSecondary_Button: successCardSecondaryButtonTheme,
    dark_OnboardingSuccessCardSecondary_Button: successCardSecondaryButtonTheme,

    light_ProfileTextAreaField: {
      background: color.governanceSurface,
      color: color.governanceText,
      borderColor: color.governanceBorder,
      borderColorHover: color.governanceBorderLight,
      borderColorFocus: color.governancePrimary,
      placeholderColor: color.governanceTextSecondary,
      shadowColorFocus: color.governanceElevationShadow,
    },
    dark_ProfileTextAreaField: {
      background: color.backgroundInput,
      color: color.textDark,
      borderColor: color.borderDark,
      borderColorHover: color.borderLight,
      borderColorFocus: color.primary,
      placeholderColor: color.textSecondaryDark,
    },
  },
} satisfies GoodWidgetConfig

export function createGovernanceWidgetConfig(config?: GoodWidgetConfig): GoodWidgetConfig {
  return {
    preset: config?.preset,
    tokens: config?.tokens,
    themes: mergeOverrideMaps(governanceWidgetConfig.themes, config?.themes),
  }
}
