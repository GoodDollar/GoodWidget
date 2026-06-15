import React from 'react'
import { Stack, useTheme } from 'tamagui'
import { createComponent } from '../createComponent'

/**
 * IconFrame — styled container for Icon content.
 * Named 'Icon' so a light_Icon / dark_Icon component sub-theme can target it.
 */
const IconFrame = createComponent(Stack, {
  name: 'Icon',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
})

// ---------------------------------------------------------------------------
// Inline SVG path registry
// Add new entries here as needed. Paths are drawn on a 24×24 viewBox.
// ---------------------------------------------------------------------------
const SVG_PATHS: Record<string, string | string[]> = {
  check: 'M20 6L9 17L4 12',
  x: 'M18 6L6 18M6 6l12 12',
  close: 'M18 6L6 18M6 6l12 12',
  'alert-circle': 'M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-.997-6.5h2v2h-2v-2zm0-8h2v6h-2v-6z',
  'alert-triangle': 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  info: 'M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-.997-4h2v-6h-2v6zm0-8h2V8h-2v2z',
  // Spinning loader — 8 spokes radiating from center
  loader: [
    'M12 2v4',
    'M12 18v4',
    'M4.93 4.93l2.83 2.83',
    'M16.24 16.24l2.83 2.83',
    'M2 12h4',
    'M18 12h4',
    'M4.93 19.07l2.83-2.83',
    'M16.24 7.76l2.83-2.83',
  ],
  spinner: [
    'M12 2v4',
    'M12 18v4',
    'M4.93 4.93l2.83 2.83',
    'M16.24 16.24l2.83 2.83',
    'M2 12h4',
    'M18 12h4',
    'M4.93 19.07l2.83-2.83',
    'M16.24 7.76l2.83-2.83',
  ],
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-up': 'M18 15l-6-6-6 6',
  'chevron-left': 'M15 18l-6-6 6-6',
  'chevron-right': 'M9 18l6-6-6-6',
  'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
  'arrow-right': 'M5 12h14M12 5l7 7-7 7',
  'arrow-down': 'M12 5v14M19 12l-7 7-7-7',
  'arrow-up': 'M12 19V5M5 12l7-7 7 7',
  copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  wallet: 'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 14a1 1 0 110-2 1 1 0 010 2zM4 7V5a2 2 0 012-2h12a2 2 0 012 2v2',
  'external-link': 'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z',
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type IconName = keyof typeof SVG_PATHS

/**
 * Icon size — maps to the icon size token scale defined in the preset.
 *   2xs=12  xs=16  sm=20  md=24  lg=32  xl=48  2xl=64
 */
export type IconSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

/**
 * Semantic color roles for icons — resolved via the active theme.
 * 'inherit' falls back to CSS currentColor (inherits from parent element).
 */
export type IconColor = 'primary' | 'text' | 'muted' | 'error' | 'success' | 'inherit'

/** Raw px values for each named size — mirrors the preset icon token scale. */
const SIZE_PX: Record<IconSize, number> = {
  '2xs': 12,
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
  '2xl': 64,
}

/**
 * Maps semantic color role to the Tamagui theme token that should drive it.
 * 'inherit' uses 'currentColor' and relies on CSS cascade; other roles are
 * resolved via the active theme.
 */
const COLOR_THEME_KEY: Record<IconColor, string> = {
  primary: '$primary',
  text: '$color',
  muted: '$placeholderColor',
  error: '$error',
  success: '$success',
  inherit: 'currentColor',
}

/**
 * Resolves a semantic icon color role to a concrete CSS color string by
 * looking up the corresponding key in the active Tamagui theme.
 * Falls back to 'currentColor' if the theme value cannot be determined.
 */
function resolveIconStrokeColor(
  theme: ReturnType<typeof useTheme>,
  color: IconColor,
): string {
  if (color === 'inherit') return 'currentColor'
  const themeKey = COLOR_THEME_KEY[color].replace('$', '')
  const themeVal = theme[themeKey as keyof typeof theme]
  if (themeVal && typeof themeVal === 'object' && 'val' in themeVal) {
    return String(themeVal.val)
  }
  return 'currentColor'
}

// Inject the spin keyframe once at module load (web only)
let _spinStyleInjected = false
function _ensureSpinStyle() {
  if (_spinStyleInjected || typeof document === 'undefined') return
  _spinStyleInjected = true
  const style = document.createElement('style')
  style.id = 'gw-icon-spin'
  style.textContent = '@keyframes gw-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'
  document.head.appendChild(style)
}

export interface IconProps {
  /** Icon name from the built-in SVG registry */
  name: IconName
  /** Size key from the preset icon token scale (default: md = 24px) */
  size?: IconSize
  /** Semantic color role; resolved against the active theme (default: text) */
  color?: IconColor
  /** Spin the icon continuously — useful for loader/spinner icons */
  spin?: boolean
  /** Render a round background behind the icon (uses borderRadius $full) */
  round?: boolean
  [key: string]: unknown
}

/**
 * Icon — renders a named SVG icon from the built-in registry.
 *
 * Size maps to the preset `icon*` token scale so spacing stays consistent
 * with the rest of the design system. Color resolves through the active
 * Tamagui theme so icons adapt automatically to theme and preset changes.
 *
 * Spin: uses a CSS keyframe animation injected once at module load time (web only).
 * Round: adds a $full borderRadius and light background pad for icon-in-badge use.
 */
export function Icon({
  name,
  size = 'md',
  color = 'text',
  spin = false,
  round = false,
  ...rest
}: IconProps) {
  const theme = useTheme()
  const px = SIZE_PX[size]
  const paths = SVG_PATHS[name]

  const strokeColor = resolveIconStrokeColor(theme, color)

  // Inject the spin keyframe once (module-level flag avoids repeated DOM lookups)
  if (spin) _ensureSpinStyle()

  const pathArray = Array.isArray(paths) ? paths : paths ? [paths] : []

  return (
    <IconFrame
      width={px}
      height={px}
      borderRadius={round ? '$full' : undefined}
      backgroundColor={round ? '$backgroundPress' : undefined}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={spin ? ({ animation: 'gw-spin 1s linear infinite' } as any) : undefined}
      {...rest}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {pathArray.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    </IconFrame>
  )
}
