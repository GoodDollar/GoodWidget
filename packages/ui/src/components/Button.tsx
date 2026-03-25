import React from 'react'
import type { ReactNode } from 'react'
import { styled, Stack, Text as TamaguiText, Theme } from 'tamagui'
import type { StackStyleBase } from '@tamagui/core'
import { createComponent } from '../createComponent'

export const ButtonFrame = createComponent(Stack, {
  name: 'Button',
  tag: 'button',
  role: 'button',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$background',
  borderRadius: '$2',
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
      primary: {},
      secondary: {
        backgroundColor: '$backgroundTransparent',
        borderWidth: 1,
        borderColor: '$borderColor',
      },
      outline: {
        backgroundColor: '$backgroundTransparent',
        borderWidth: 1,
        borderColor: '$color',
      },
      ghost: {
        backgroundColor: '$backgroundTransparent',
      },
    },
    size: {
      sm: { height: '$8', paddingHorizontal: '$3', gap: '$1' },
      md: { height: '$10', paddingHorizontal: '$4', gap: '$2' },
      lg: { height: '$11', paddingHorizontal: '$5', gap: '$2' },
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
  color: '$color',
  userSelect: 'none',
})

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  fullWidth?: boolean
  onPress?: () => void
  children?: ReactNode
  [key: string]: unknown
}

/**
 * The light_Button theme sets color to white for primary buttons on a colored
 * background.  For secondary/outline/ghost variants the background is
 * transparent, so we reset the theme so that children (ButtonText) pick up
 * the parent theme's dark text color instead.
 */
export function Button({
  variant = 'primary',
  children,
  ...props
}: ButtonProps) {
  const needsReset = variant !== 'primary'
  return (
    <ButtonFrame variant={variant} {...props}>
      {needsReset ? <Theme reset>{children}</Theme> : children}
    </ButtonFrame>
  )
}
