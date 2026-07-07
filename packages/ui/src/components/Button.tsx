import React from 'react'
import type { ReactNode } from 'react'
import { styled, Stack, Text as TamaguiText, Theme } from 'tamagui'
import { createComponent } from '../createComponent'

/**
 * ButtonFrame — the styled base for all Button variants.
 *
 * Named 'Button' so Tamagui resolves the light_Button / dark_Button
 * component sub-themes automatically.
 *
 * Design values come from the active theme and token scales — no
 * hardcoded hex colors here. The preset drives all visual changes.
 *
 * Variant inventory:
 *   variant  → primary | secondary | outline | ghost | pill | text | list
 *   size     → sm | md | lg (standard interactive sizes)
 *   iconSize → sm | md | lg | larger  (for icon-only buttons)
 *   disabled → true
 *   fullWidth → true
 *
 * Default radius uses $full (pill) to match GoodWalletV2 brand language.
 * Override per-instance with explicit borderRadius prop if needed.
 */
export const ButtonFrame = createComponent(Stack, {
  name: 'Button',
  tag: 'button',
  role: 'button',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$background',
  // GoodWalletV2 brand: solid buttons use pill radius by default
  borderRadius: '$full',
  paddingHorizontal: '$4',
  height: '$10',
  gap: '$2',
  cursor: 'pointer',
  borderWidth: 0,

  hoverStyle: {
    backgroundColor: '$backgroundHover',
  },
  pressStyle: {
    backgroundColor: '$backgroundPress',
    opacity: 0.9,
  },
  focusStyle: {
    backgroundColor: '$backgroundFocus',
    outlineStyle: 'solid',
    outlineWidth: 2,
    outlineColor: '$borderColorFocus',
  },

  variants: {
    variant: {
      // Solid filled — driven by light_Button / dark_Button component theme.
      // Inherits the $full pill radius from ButtonFrame default.
      primary: {},
      // Transparent with border — inherits $full pill radius for brand consistency.
      secondary: {
        backgroundColor: '$backgroundTransparent',
        borderWidth: 1,
        borderColor: '$borderColor',
      },
      // Transparent with colored border — inherits $full pill radius.
      outline: {
        backgroundColor: '$backgroundTransparent',
        borderWidth: 1,
        borderColor: '$color',
      },
      // Transparent, no border — inherits $full pill radius; hover changes bg only.
      ghost: {
        backgroundColor: '$backgroundTransparent',
      },
      // Badge/chip style — explicit $full radius, muted bg, colored text
      pill: {
        height: 35,
        borderRadius: '$full',
        paddingHorizontal: '$3',
        backgroundColor: '$backgroundPress',
        borderWidth: 0,
        gap: '$1',
      },
      // Full-width text link — no bg change on hover; no visible radius needed.
      text: {
        backgroundColor: '$backgroundTransparent',
        borderWidth: 0,
        borderRadius: 0,
        paddingHorizontal: 0,
        height: 'auto',
        hoverStyle: { opacity: 0.7, backgroundColor: '$backgroundTransparent' },
        pressStyle: { opacity: 0.5, backgroundColor: '$backgroundTransparent' },
      },
      // Icon + label row — smaller $2 radius for a rectangular row appearance.
      list: {
        backgroundColor: '$backgroundTransparent',
        borderWidth: 0,
        borderRadius: '$2',
        justifyContent: 'flex-start',
        width: '100%',
        minHeight: 42,
        paddingHorizontal: '$3',
        gap: '$3',
        hoverStyle: { backgroundColor: '$backgroundHover' },
        pressStyle: { backgroundColor: '$backgroundPress', opacity: 1 },
      },
    },

    // Standard interactive sizes
    size: {
      sm: { height: '$8', paddingHorizontal: '$3', gap: '$1' },
      md: { height: '$10', paddingHorizontal: '$4', gap: '$2' },
      lg: { height: '$11', paddingHorizontal: '$5', gap: '$2' },
    },

    // Icon-only sizes (transparent bg, square, no padding)
    iconSize: {
      sm: {
        width: '$iconXs',
        height: '$iconXs',
        padding: 0,
        paddingHorizontal: 0,
        backgroundColor: '$backgroundTransparent',
        borderWidth: 0,
        borderRadius: '$2',
      },
      md: {
        width: '$iconSm',
        height: '$iconSm',
        padding: 0,
        paddingHorizontal: 0,
        backgroundColor: '$backgroundTransparent',
        borderWidth: 0,
        borderRadius: '$2',
      },
      lg: {
        width: '$iconMd',
        height: '$iconMd',
        padding: 0,
        paddingHorizontal: 0,
        backgroundColor: '$backgroundTransparent',
        borderWidth: 0,
        borderRadius: '$2',
      },
      larger: {
        width: '$iconLg',
        height: '$iconLg',
        padding: 0,
        paddingHorizontal: 0,
        backgroundColor: '$backgroundTransparent',
        borderWidth: 0,
        borderRadius: '$2',
      },
    },

    disabled: {
      true: { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' },
    },
    fullWidth: {
      true: { width: '100%' },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
})

export const ButtonText = styled(TamaguiText, {
  name: 'ButtonText',
  fontFamily: '$body',
  fontSize: '$3',
  fontWeight: '600',
  color: '$textColor',
  userSelect: 'none',
})

/** Pill label text — uppercase 11px, tracking wide */
export const PillText = styled(TamaguiText, {
  name: 'PillText',
  fontFamily: '$body',
  fontSize: 11,
  fontWeight: '600',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: '$color',
  userSelect: 'none',
})

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'pill' | 'text' | 'list'
  size?: 'sm' | 'md' | 'lg'
  iconSize?: 'sm' | 'md' | 'lg' | 'larger'
  disabled?: boolean
  fullWidth?: boolean
  onPress?: () => void
  children?: ReactNode
  [key: string]: unknown
}

/**
 * The light_Button / dark_Button component theme sets `color: white` for
 * primary buttons rendered on the brand-colored background. Non-primary
 * variants (secondary, outline, ghost, text, list) use transparent or no
 * background, so the inherited white would be invisible. `Theme reset`
 * discards the Button component theme, letting children (ButtonText) pick
 * up the parent theme's text color — which is the correct readable color
 * for transparent-background buttons.
 */
export function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  const needsReset = variant !== 'primary'
  return (
    <ButtonFrame variant={variant} {...props}>
      {needsReset ? <Theme reset>{children}</Theme> : children}
    </ButtonFrame>
  )
}
