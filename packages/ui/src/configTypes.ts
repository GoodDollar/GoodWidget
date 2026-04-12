export type GoodWidgetTokenValue = string | number

export type DesignTokenScale = Record<string, GoodWidgetTokenValue>

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

export interface WidgetDesignSemantics {
  surface: Record<string, string>
  text: Record<string, string>
  border: Record<string, string>
  action: Record<string, string>
  feedback?: Record<string, string>
  accent?: Record<string, string>
}

export interface WidgetFontDefinition {
  family?: string
  size?: Record<string, number>
  lineHeight?: Record<string, number>
  weight?: Record<string, string>
  letterSpacing?: Record<string, number>
}

export interface WidgetComponentTheme {
  background?: string
  backgroundHover?: string
  backgroundPress?: string
  backgroundFocus?: string
  color?: string
  colorHover?: string
  colorPress?: string
  colorFocus?: string
  borderColor?: string
  borderColorHover?: string
  borderColorPress?: string
  borderColorFocus?: string
  shadowColor?: string
  shadowColorHover?: string
  shadowColorPress?: string
  shadowColorFocus?: string
  placeholderColor?: string
  radius?: string | number
}

export interface WidgetTypographyPreset {
  body?: WidgetFontDefinition
  heading?: WidgetFontDefinition
}

export interface WidgetAnimationConfig {
  type?: 'spring' | 'timing'
  delay?: number
  duration?: number
  bounciness?: number
  damping?: number
  friction?: number
  mass?: number
  overshootClamping?: boolean
  speed?: number
  stiffness?: number
  tension?: number
  velocity?: number
}

export interface WidgetAnimationsPreset {
  quick?: WidgetAnimationConfig
  medium?: WidgetAnimationConfig
  slow?: WidgetAnimationConfig
  exit?: WidgetAnimationConfig
}

export interface WidgetDesignPreset {
  id: string
  version: string
  tokens?: GoodWidgetTokenOverrides
  themes?: Record<string, Partial<GoodWidgetThemeValues>>
  typography?: WidgetTypographyPreset
  animations?: WidgetAnimationsPreset
  semantics?: WidgetDesignSemantics
  componentThemes?: Record<string, WidgetComponentTheme>
}

export interface GoodWidgetThemeOverrides {
  tokens?: GoodWidgetTokenOverrides
  themes?: Record<string, Partial<GoodWidgetThemeValues>>
}

export interface GoodWidgetConfig {
  preset?: WidgetDesignPreset
  tokens?: GoodWidgetTokenOverrides
  themes?: Record<string, Partial<GoodWidgetThemeValues>>
}
