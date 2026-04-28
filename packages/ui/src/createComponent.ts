import { styled } from 'tamagui'
import type { GetProps, TamaguiComponent } from 'tamagui'
import { registerComponent } from './manifest'

const THEME_KEY_NAMES = [
  'background',
  'backgroundHover',
  'backgroundPress',
  'backgroundFocus',
  'color',
  'colorHover',
  'colorPress',
  'colorFocus',
  'colorSoft',
  'colorDim',
  'borderColor',
  'borderColorHover',
  'borderColorPress',
  'borderColorFocus',
  'shadowColor',
  'shadowColorHover',
  'shadowColorPress',
  'shadowColorFocus',
  'placeholderColor',
] as const

/**
 * Wrapper around Tamagui's `styled()` that enforces a `name` prop and
 * auto-registers the component in the theme manifest for discoverability.
 *
 * Usage is identical to styled() except `name` is required in the options.
 *
 * Returns `any` because Tamagui's `styled()` return type encodes variant
 * information via deep conditional generics that cannot be preserved through
 * a generic wrapper function today. The trade-off is no autocomplete on
 * custom variant props, but:
 *  - All Tamagui style props and standard component props still work at runtime.
 *  - Consumers don't get false "property does not exist" type errors.
 *  - Component-level theme overrides still work (driven by `name`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createComponent(base: TamaguiComponent, options: Record<string, any> & { name: string; extends?: string }): any {
  const { extends: extendsName, ...rest } = options

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component = styled(base as any, rest)

  const variantKeys = rest.variants ? Object.keys(rest.variants) : []

  registerComponent({
    name: rest.name,
    extends: extendsName,
    themeKeys: [...THEME_KEY_NAMES] as string[],
    variants: variantKeys,
  })

  return component
}

export type { GetProps }
