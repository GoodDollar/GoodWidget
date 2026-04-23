import { Separator as TamaguiSeparator } from 'tamagui'
import { createComponent } from '../createComponent'

/**
 * Separator — thin divider line.
 *
 * Uses Tamagui's native Separator primitive for semantic correctness.
 * All visual values come from the active theme and token scales.
 *
 * Variants:
 *   size    → sm (1px) | md (2px) | lg (4px)
 *   color   → default ($borderColor) | muted ($borderColor, 0.4 opacity) | primary ($primary token)
 *   vertical → true (switches from horizontal to vertical orientation)
 */
export const Separator = createComponent(TamaguiSeparator as any, {
  name: 'Separator',
  // Default: horizontal 1px rule, full-width
  width: '100%',
  backgroundColor: '$borderColor',
  borderWidth: 0,
  borderColor: 'transparent',

  variants: {
    size: {
      sm: { height: 1 },
      md: { height: 2 },
      lg: { height: 4 },
    },
    color: {
      // Uses the current theme borderColor — adapts to light/dark and presets
      default: { backgroundColor: '$borderColor' },
      // Reduced-opacity divider — softer visual separation
      muted: { backgroundColor: '$borderColor', opacity: 0.4 },
      // Brand-primary divider — uses $primary color token
      primary: { backgroundColor: '$primary' },
    },
    vertical: {
      true: {
        height: '100%',
        width: 1,
      },
    },
  } as const,

  defaultVariants: {
    size: 'sm',
    color: 'default',
  },
})
