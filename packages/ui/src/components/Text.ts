import { Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'

/**
 * GoodWidget Text primitive.
 *
 * Color variants use semantic theme keys so they respond correctly
 * to the active preset and light/dark context:
 *   - default    → $color (base text, inherits from active theme)
 *   - secondary  → $placeholderColor (muted / secondary text)
 *   - soft       → $colorSoft (mid-level soft; between default and secondary)
 *   - dim        → $colorDim (tertiary / helper text)
 *
 * Layout helpers:
 *   - truncate   → single-line ellipsis
 *   - noWrap     → prevent text from wrapping
 */
export const Text = createComponent(TamaguiText, {
  name: 'Text',
  fontFamily: '$body',
  color: '$color',
  fontSize: '$3',
  lineHeight: '$3',

  variants: {
    variant: {
      body: { fontSize: '$3', lineHeight: '$3' },
      caption: { fontSize: '$1', lineHeight: '$1', color: '$placeholderColor' },
      label: { fontSize: '$2', lineHeight: '$2', fontWeight: '500' },
      large: { fontSize: '$5', lineHeight: '$5' },
    },
    // Named color levels, all resolved against the active theme
    color: {
      default: { color: '$color' },
      secondary: { color: '$placeholderColor' },
      soft: { color: '$colorSoft' },
      dim: { color: '$colorDim' },
    },
    // Kept for backward compatibility
    secondary: {
      true: { color: '$placeholderColor' },
    },
    bold: {
      true: { fontWeight: '700' },
    },
    center: {
      true: { textAlign: 'center' },
    },
    // Single-line ellipsis — clips overflow text with "…"
    truncate: {
      true: {
        numberOfLines: 1,
        overflow: 'hidden' as const,
        textOverflow: 'ellipsis' as const,
        whiteSpace: 'nowrap' as const,
      },
    },
    // Prevent line-wrapping entirely
    noWrap: {
      true: {
        whiteSpace: 'nowrap' as const,
        flexShrink: 0,
      },
    },
  } as const,
})
