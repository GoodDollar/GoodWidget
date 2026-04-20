import React, { useCallback } from 'react'
import { Stack, Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'

const CheckboxFrame = createComponent(Stack, {
  name: 'Checkbox',
  tag: 'button',
  role: 'checkbox',
  width: 20,
  height: 20,
  borderRadius: '$1',
  borderWidth: 2,
  borderColor: '$borderColor',
  backgroundColor: '$backgroundTransparent',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',

  hoverStyle: {
    borderColor: '$borderColorHover',
  },
  focusStyle: {
    borderColor: '$borderColorFocus',
  },

  variants: {
    checked: {
      true: {
        backgroundColor: '$background',
        borderColor: '$borderColor',
      },
    },
    disabled: {
      true: { opacity: 0.5, cursor: 'not-allowed' },
    },
  } as const,
})

interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Checkbox({ checked = false, onCheckedChange, label, disabled }: CheckboxProps) {
  const handlePress = useCallback(() => {
    if (!disabled) onCheckedChange?.(!checked)
  }, [checked, onCheckedChange, disabled])

  return (
    <Stack flexDirection="row" alignItems="center" gap="$2" cursor={disabled ? 'not-allowed' : 'pointer'} onPress={handlePress}>
      <CheckboxFrame checked={checked} disabled={disabled}>
        {checked && (
          <TamaguiText fontSize={12} color="$color" lineHeight={14}>
            ✓
          </TamaguiText>
        )}
      </CheckboxFrame>
      {label && (
        <TamaguiText fontFamily="$body" fontSize="$3" color="$color">
          {label}
        </TamaguiText>
      )}
    </Stack>
  )
}
