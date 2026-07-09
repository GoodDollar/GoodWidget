import type { GoodWidgetThemeOverrides } from '@goodwidget/ui'

/**
 * Shared "brand preset" overrides used to drive the `brandPreset` Storybook
 * control across widget showcase stories, demonstrating the host override
 * surface with a couple of concrete brand colors.
 *
 * Each named component theme gets both a `dark_*` and `light_*` entry so the
 * preset stays visible regardless of the `defaultTheme` control — dark and
 * light use different field values (light shadows are much lower-opacity,
 * light text is a saturated/dark shade of the brand color for contrast on a
 * light background) but target the same components.
 *
 * `ClaimActionInner` is intentionally dark-only: the base design preset
 * (packages/ui/src/presets.ts) never defines a light variant for it either,
 * so there's no light contrast baseline to diverge from here.
 */
export const cobaltOverrides: GoodWidgetThemeOverrides = {
  tokens: {
    color: {
      primary: '#2E5DE8',
      primaryDark: '#1D3EB2',
      primaryLight: '#6E8DFF',
    },
  },
  themes: {
    dark_ClaimCard: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.7)' },
    light_ClaimCard: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.12)' },
    dark_ClaimActionGlow: { backgroundColor: '#4F7DFF', primaryLight: '#9DB4FF' },
    light_ClaimActionGlow: { backgroundColor: '#2E5DE8', glowOpacity: '0.1' },
    dark_ClaimActionRing: { primary: '#2E5DE8', primaryLight: '#6E8DFF' },
    light_ClaimActionRing: { primary: '#2E5DE8', primaryLight: '#6E8DFF' },
    dark_ClaimActionInner: { backgroundDark: '#0E1A3A', backgroundDarkHover: '#172B60' },
    dark_TokenAmountText: { color: '#BBD0FF', secondaryColor: '#7FA2FF' },
    light_TokenAmountText: { color: '#1D3EB2', secondaryColor: '#3C5FC7' },
    // StreamingWidget card surfaces — not part of the Claim component family, so they
    // need their own entries for the brand preset to visibly affect that widget too.
    dark_StreamRow: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.7)' },
    light_StreamRow: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.12)' },
    dark_PoolRow: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.7)' },
    light_PoolRow: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.12)' },
    dark_BalanceCard: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.7)' },
    light_BalanceCard: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.12)' },
    dark_EmptyStateCard: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.7)' },
    light_EmptyStateCard: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.12)' },
    dark_ErrorStateCard: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.7)' },
    light_ErrorStateCard: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.12)' },
    dark_SetStreamFormCard: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.7)' },
    light_SetStreamFormCard: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.12)' },
  },
}

export const tealOverrides: GoodWidgetThemeOverrides = {
  tokens: {
    color: {
      primary: '#00A884',
      primaryDark: '#007A61',
      primaryLight: '#33C9AA',
    },
  },
  themes: {
    dark_ClaimCard: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.65)' },
    light_ClaimCard: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.12)' },
    dark_ClaimActionGlow: { backgroundColor: '#33C9AA', primaryLight: '#78E0CB' },
    light_ClaimActionGlow: { backgroundColor: '#00A884', glowOpacity: '0.1' },
    dark_ClaimActionRing: { primary: '#00A884', primaryLight: '#33C9AA' },
    light_ClaimActionRing: { primary: '#00A884', primaryLight: '#33C9AA' },
    dark_ClaimActionInner: { backgroundDark: '#062A23', backgroundDarkHover: '#0B3B31' },
    dark_TokenAmountText: { color: '#BFF5E7', secondaryColor: '#66D5BB' },
    light_TokenAmountText: { color: '#007A61', secondaryColor: '#1F9C82' },
    // StreamingWidget card surfaces — see cobaltOverrides comment above.
    dark_StreamRow: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.65)' },
    light_StreamRow: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.12)' },
    dark_PoolRow: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.65)' },
    light_PoolRow: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.12)' },
    dark_BalanceCard: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.65)' },
    light_BalanceCard: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.12)' },
    dark_EmptyStateCard: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.65)' },
    light_EmptyStateCard: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.12)' },
    dark_ErrorStateCard: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.65)' },
    light_ErrorStateCard: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.12)' },
    dark_SetStreamFormCard: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.65)' },
    light_SetStreamFormCard: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.12)' },
  },
}

export const BRAND_PRESET_OPTIONS = ['None', 'Cobalt', 'Teal'] as const
export type BrandPreset = (typeof BRAND_PRESET_OPTIONS)[number]

export function brandPresetOverrides(preset: BrandPreset | undefined): GoodWidgetThemeOverrides | undefined {
  switch (preset) {
    case 'Cobalt':
      return cobaltOverrides
    case 'Teal':
      return tealOverrides
    default:
      return undefined
  }
}
