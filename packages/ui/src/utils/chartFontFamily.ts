/**
 * CHART_FONT_FAMILY — shared sans-serif font stack for analytics chart SVG
 * text. react-native-svg's <Text> isn't part of Tamagui's styling system (the
 * same reason resolveThemeColor exists for fill/stroke), so it can't resolve
 * the `$body` token the rest of the UI uses and falls back to the browser's
 * default serif font. Mirrors the default preset's typography.body.family
 * (packages/ui/src/presets.ts) so SVG-drawn text matches the rest of the UI.
 */
export const CHART_FONT_FAMILY = 'Avenir Next, Inter, system-ui, -apple-system, sans-serif'
