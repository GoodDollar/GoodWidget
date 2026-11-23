import assert from 'node:assert/strict'
import test from 'node:test'

import { goodWalletV2Preset } from './presets.ts'

/**
 * Text contrast in the default preset (WCAG 2.x, success criterion 1.4.3, level AA).
 *
 * Every text color role must reach 4.5:1 against every background role it can be
 * drawn on, in both themes. Normal-size text needs 4.5:1, and the theme colors are
 * shared by 12px captions, so the 3:1 allowance for large text is deliberately not used.
 *
 * Not covered here: border, icon and focus colors (3:1, criterion 1.4.11), status colors
 * (success, warning, error) and the opacity applied by individual components.
 */

const MIN_TEXT_CONTRAST = 4.5

// Roles read from the theme objects in presets.ts. Written out so a reviewer sees exactly what is checked.
const TEXT_ROLES = [
  'color', // Text tone "default"
  'colorSoft', // Text tone "soft"
  'colorDim', // Text tone "dim"
  'placeholderColor', // Text tone "secondary" and the default color of variant="caption"
  'secondaryColor', // Secondary amounts and labels
  'colorLink', // Anchor
] as const

const BACKGROUND_ROLES = {
  dark: [
    'background',
    'backgroundSurface',
    'backgroundRaised',
    'backgroundInput',
    'backgroundSurfaceAlt',
  ],
  light: [
    'background',
    'backgroundSurface',
    'backgroundDark',
    'backgroundRaised',
    'backgroundInput',
  ],
} as const

// Order rule: against the page background, default text is stronger than soft, and soft is stronger than dim.
const ORDERED_ROLES = ['color', 'colorSoft', 'colorDim'] as const

type Rgb = [number, number, number]
type ThemeName = keyof typeof BACKGROUND_ROLES

function hexToRgb(hex: string): Rgb {
  const digits = hex.replace('#', '')
  const full = digits.length === 3 ? [...digits].map((d) => d + d).join('') : digits
  assert.match(full, /^[0-9a-fA-F]{6}$/, `expected a hex color, got "${hex}"`)
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb
}

function linearize(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

function contrastRatio(foreground: Rgb, background: Rgb): number {
  const a = luminance(foreground)
  const b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** A color drawn at the given opacity over a background, flattened to a solid color. */
function blend(foreground: Rgb, background: Rgb, alpha: number): Rgb {
  return foreground.map((f, i) => Math.round(alpha * f + (1 - alpha) * background[i])) as Rgb
}

function themeValue(theme: ThemeName, role: string): string {
  const value = goodWalletV2Preset.themes?.[theme]?.[role]
  assert.ok(value, `${theme} theme has no "${role}" role`)
  return value
}

for (const theme of Object.keys(BACKGROUND_ROLES) as ThemeName[]) {
  test(`${theme}: every text role reaches ${MIN_TEXT_CONTRAST}:1 on every background`, () => {
    const failures: string[] = []

    for (const textRole of TEXT_ROLES) {
      const text = goodWalletV2Preset.themes?.[theme]?.[textRole]
      if (!text) {
        failures.push(`${theme} theme has no "${textRole}" role`)
        continue
      }
      for (const backgroundRole of BACKGROUND_ROLES[theme]) {
        const background = themeValue(theme, backgroundRole)
        const ratio = contrastRatio(hexToRgb(text), hexToRgb(background))
        if (ratio < MIN_TEXT_CONTRAST) {
          failures.push(
            `${theme} ${textRole} ${text} on ${backgroundRole} ${background} = ${ratio.toFixed(2)}, needs ${MIN_TEXT_CONTRAST}`,
          )
        }
      }
    }

    assert.deepEqual(failures, [], `\n${failures.join('\n')}\n`)
  })

  test(`${theme}: default text is stronger than soft, and soft is stronger than dim`, () => {
    const background = hexToRgb(themeValue(theme, 'background'))
    const ratios = ORDERED_ROLES.map((role) => ({
      role,
      ratio: contrastRatio(hexToRgb(themeValue(theme, role)), background),
    }))

    for (let i = 0; i < ratios.length - 1; i++) {
      assert.ok(
        ratios[i].ratio > ratios[i + 1].ratio,
        `${theme} ${ratios[i].role} (${ratios[i].ratio.toFixed(2)}) must be stronger than ${ratios[i + 1].role} (${ratios[i + 1].ratio.toFixed(2)}) on the page background`,
      )
    }
  })
}

// Card sub-themes (dark_Card, light_Card and the others in theme.ts) are built from the secondary text tokens,
// so captions and labels inside cards render with these two values.
test('secondary text tokens reach 4.5:1 on the backgrounds of their theme', () => {
  const tokens = goodWalletV2Preset.tokens?.color as Record<string, string>
  const failures: string[] = []

  for (const [theme, token] of [
    ['dark', 'textSecondaryDark'],
    ['light', 'textSecondary'],
  ] as const) {
    for (const backgroundRole of BACKGROUND_ROLES[theme]) {
      const background = themeValue(theme, backgroundRole)
      const ratio = contrastRatio(hexToRgb(tokens[token]), hexToRgb(background))
      if (ratio < MIN_TEXT_CONTRAST) {
        failures.push(
          `${theme} token ${token} ${tokens[token]} on ${backgroundRole} ${background} = ${ratio.toFixed(2)}, needs ${MIN_TEXT_CONTRAST}`,
        )
      }
    }
  }

  assert.deepEqual(failures, [], `\n${failures.join('\n')}\n`)
})

// Scorecard draws a white 4.5% overlay over the card surface (CARD_ELEVATION_OVERLAY_COLOR in Scorecard.tsx).
// Its labels and trend text use placeholderColor and colorDim, so they are checked on the blended surface too.
test('dark: Scorecard text reaches 4.5:1 on the card surface with its elevation overlay', () => {
  const surface = hexToRgb(themeValue('dark', 'backgroundSurface'))
  const card = blend([255, 255, 255], surface, 0.045)

  for (const role of ['placeholderColor', 'colorDim'] as const) {
    const text = themeValue('dark', role)
    const ratio = contrastRatio(hexToRgb(text), card)
    assert.ok(
      ratio >= MIN_TEXT_CONTRAST,
      `dark ${role} ${text} on Scorecard card [${card.join(', ')}] = ${ratio.toFixed(2)}, needs ${MIN_TEXT_CONTRAST}`,
    )
  }
})
