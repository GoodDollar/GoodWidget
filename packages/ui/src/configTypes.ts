export type GoodWidgetTokenValue = string | number

export interface GoodWidgetTokenValues {
  color: Record<string, string>
  size: Record<string, number>
  space: Record<string, number>
  radius: Record<string, number>
  zIndex: Record<string, number>
}

export type GoodWidgetTokenOverrides = {
  [K in keyof GoodWidgetTokenValues]?: Partial<GoodWidgetTokenValues[K]>
}

export type GoodWidgetThemeValues = Record<string, string>

export type GoodWidgetThemes = Record<string, GoodWidgetThemeValues>

export interface GoodWidgetThemeOverrides {
  tokens?: GoodWidgetTokenOverrides
  themes?: Record<string, Partial<GoodWidgetThemeValues>>
}

export interface GoodWidgetConfig {
  tokens?: GoodWidgetTokenOverrides
  themes?: Record<string, Partial<GoodWidgetThemeValues>>
}
