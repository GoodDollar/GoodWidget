import type { GoodWidgetConfig } from '@goodwidget/core'
import { defaultTokenPreset } from '@goodwidget/ui'

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
 * semantics that the governance components consume directly.
 */
export const governanceWidgetConfig = {
  themes: {
    light: governanceImpactTheme,
    dark: governanceImpactTheme,
    light_GovernanceWrapper: {
      background: color.governanceSurface,
    },
    dark_GovernanceWrapper: {
      background: color.surfaceDark,
    },
    light_ImpactCard: {
      background: color.governancePrimary,
      shadowColor: color.governanceElevationShadow,
    },
    dark_ImpactCard: {
      background: color.primary,
      shadowColor: 'rgba(3, 7, 18, 0.9)',
    },
  },
} satisfies GoodWidgetConfig
