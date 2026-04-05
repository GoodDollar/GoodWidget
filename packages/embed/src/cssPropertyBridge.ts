import type { GoodWidgetThemeOverrides } from '@goodwidget/core'
import type { ThemeManifest } from '@goodwidget/ui'

const GW_PREFIX = '--gw-'
const GW_TOKEN_PREFIX = `${GW_PREFIX}token-`

/**
 * Read CSS custom properties from a host element and convert them into
 * a GoodWidgetThemeOverrides object that can be merged into the provider.
 *
 * Naming convention:
 * - Global tokens:    --gw-token-color-primary, --gw-token-space-md, --gw-token-radius-lg
 * - Component themes: --gw-Card-background, --gw-GlassCard-borderColor
 *
 * Token parsing keeps backward compatibility with the previous undocumented
 * `--gw-{category}-{name}` fallback so existing embeds do not break.
 */
export function readCSSOverrides(
  element: HTMLElement,
  manifest?: ThemeManifest,
): GoodWidgetThemeOverrides {
  const computed = getComputedStyle(element)
  const tokenOverrides: Record<string, Record<string, string | number>> = {}
  const themeOverrides: Record<string, Record<string, string | number>> = {}

  const tokenCategories = manifest?.tokens
    ? Object.keys(manifest.tokens)
    : ['color', 'space', 'size', 'radius']

  for (const category of tokenCategories) {
    const tokenNames = manifest?.tokens?.[category] ?? []
    for (const tokenName of tokenNames) {
      const varName = `${GW_TOKEN_PREFIX}${category}-${tokenName}`
      const legacyVarName = `${GW_PREFIX}${category}-${tokenName}`
      const value =
        computed.getPropertyValue(varName).trim() || computed.getPropertyValue(legacyVarName).trim()
      if (value) {
        if (!tokenOverrides[category]) tokenOverrides[category] = {}
        tokenOverrides[category][tokenName] = isNumericValue(value) ? parseFloat(value) : value
      }
    }
  }

  const componentNames = manifest?.components ? Object.keys(manifest.components) : []
  for (const componentName of componentNames) {
    const themeKeys = manifest?.components[componentName]?.themeKeys ?? []
    for (const themeKey of themeKeys) {
      const varName = `${GW_PREFIX}${componentName}-${themeKey}`
      const value = computed.getPropertyValue(varName).trim()
      if (value) {
        const lightKey = `light_${componentName}`
        const darkKey = `dark_${componentName}`
        if (!themeOverrides[lightKey]) themeOverrides[lightKey] = {}
        if (!themeOverrides[darkKey]) themeOverrides[darkKey] = {}
        const parsed = isNumericValue(value) ? parseFloat(value) : value
        themeOverrides[lightKey][themeKey] = parsed
        themeOverrides[darkKey][themeKey] = parsed
      }
    }
  }

  const result: GoodWidgetThemeOverrides = {}
  if (Object.keys(tokenOverrides).length > 0) result.tokens = tokenOverrides
  if (Object.keys(themeOverrides).length > 0) result.themes = themeOverrides
  return result
}

function isNumericValue(value: string): boolean {
  // Match numbers optionally ending with px
  const stripped = value.replace(/px$/, '')
  return !isNaN(Number(stripped)) && stripped.length > 0
}

/**
 * Set up a MutationObserver to re-read CSS custom properties when
 * the host element's style attribute changes.
 */
export function observeCSSChanges(
  element: HTMLElement,
  manifest: ThemeManifest | undefined,
  onUpdate: (overrides: GoodWidgetThemeOverrides) => void,
): () => void {
  const observer = new MutationObserver(() => {
    const overrides = readCSSOverrides(element, manifest)
    onUpdate(overrides)
  })

  observer.observe(element, {
    attributes: true,
    attributeFilter: ['style', 'class'],
  })

  return () => observer.disconnect()
}
