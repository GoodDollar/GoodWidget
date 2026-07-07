import type { GoodWidgetConfig } from '@goodwidget/ui'

// Reserve-widget palette tokens.
//
// The GoodWalletV2 preset tokens are close matches for most surfaces; we only
// define widget-scoped token *extensions* for the reserve-specific colours that
// have no semantic equivalent in the shared preset (e.g. the Figma card shell
// #0C0E15, the amount-input card #252730). Everything else — primary, success,
// error, text, border — is inherited from the shared preset's token/theme chain.
//
// Source: Figma file xsk5EiF6CvStA9mtdbA9OR, page GoodReserve.
const reserveTokenPreset = {
  // Outer card shell (darker than $surface)
  reserveCard: '#0C0E15',
  // Amount input card
  reserveInputCard: '#252730',
  // Token badge / icon background / settings button
  reserveBadge: '#33343C',
  // Muted / secondary label text
  reserveTextMuted: '#8B91A0',
  // Secondary value text
  reserveTextSecondary: '#C1C6D6',
  // Heading / accent (close to $primary/#1A85FF — using preset $primary preferred)
  reserveHeading: '#4090FF',
  // Soft accent for links (lighter blue)
  reserveAccentSoft: '#AAC7FF',
  // Positive / success amount text
  reservePositive: '#43E350',
} as const

// Semantic theme overrides for the reserve widget.
// Named components resolve `color`, `backgroundColor`, `borderColor`, and
// `shadowColor` from the active light/dark sub-theme, which is exactly how the
// rest of the design system works. Widget-specific values that differ from the
// shared preset are pinned here; anything that matches the preset is left to
// resolve through the normal chain.
const reserveTheme = {
  // Extended palette tokens available as `$reserveCard` etc. inside the widget.
  reserveCard: reserveTokenPreset.reserveCard,
  reserveInputCard: reserveTokenPreset.reserveInputCard,
  reserveBadge: reserveTokenPreset.reserveBadge,
  reserveTextMuted: reserveTokenPreset.reserveTextMuted,
  reserveTextSecondary: reserveTokenPreset.reserveTextSecondary,
  reserveHeading: reserveTokenPreset.reserveHeading,
  reserveAccentSoft: reserveTokenPreset.reserveAccentSoft,
  reservePositive: reserveTokenPreset.reservePositive,
} as const

/**
 * Reserve-widget author defaults.
 *
 * Shared preset values stay in @goodwidget/ui. This config only adds
 * widget-local token extensions that the reserve components consume directly
 * via `$reserveCard`, `$reserveBadge`, etc. in their createComponent calls.
 *
 * Sub-theme overrides per component (light_ReserveSwapShell, etc.) are not
 * needed here because createComponent already defines the default values via
 * Tamagui token references. Integrators who want to change a specific
 * component's styling can do so via themeOverrides:
 *   <GoodReserveWidget themeOverrides={{ themes: { light: { reserveCard: '...' } } }} />
 */
export const goodReserveWidgetConfig = {
  themes: {
    light: reserveTheme,
    dark: reserveTheme,
  },
} satisfies GoodWidgetConfig
