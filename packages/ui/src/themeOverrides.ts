import type { GoodWidgetThemeValues } from './configTypes'

type ThemeOverrideMap = Record<string, Partial<GoodWidgetThemeValues>>

/**
 * `Anchor` reads the `colorLink` role. Before that role existed, links used `primary`, so a theme
 * layer that sets `primary` and says nothing about `colorLink` still expects its links to follow
 * it. This gives such a layer `colorLink: primary`; a layer that sets `colorLink` itself is left
 * alone.
 */
export function linkFollowsPrimary(themes?: ThemeOverrideMap): ThemeOverrideMap | undefined {
  if (!themes) return themes

  const result: ThemeOverrideMap = {}
  for (const [name, values] of Object.entries(themes)) {
    result[name] =
      values.primary && values.colorLink === undefined
        ? { ...values, colorLink: values.primary }
        : values
  }
  return result
}

/**
 * Merges partial theme override maps by theme name.
 * A layer that overrides `primary` without `colorLink` keeps links following its `primary`.
 */
export function mergeOverrideMaps(
  base?: ThemeOverrideMap,
  override?: ThemeOverrideMap,
): ThemeOverrideMap | undefined {
  if (!base && !override) return undefined

  const merged: ThemeOverrideMap = {
    ...(base ?? {}),
  }

  if (override) {
    for (const [name, values] of Object.entries(linkFollowsPrimary(override) ?? {})) {
      merged[name] = { ...(merged[name] ?? {}), ...values } as Partial<GoodWidgetThemeValues>
    }
  }

  return merged
}
