import React, { useCallback } from 'react'
import { Stack, Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'

const SwitchTrack = createComponent(Stack, {
  name: 'Switch',
  tag: 'button',
  role: 'switch',
  width: 44,
  height: 24,
  borderRadius: 12,
  backgroundColor: '$borderColor',
  padding: 2,
  cursor: 'pointer',
  justifyContent: 'center',

  variants: {
    active: {
      true: {
        backgroundColor: '$background',
      },
    },
    disabled: {
      true: { opacity: 0.5, cursor: 'not-allowed' },
    },
  } as const,
})

const SwitchThumb = createComponent(Stack, {
  name: 'SwitchThumb',
  width: 20,
  height: 20,
  borderRadius: 10,
  backgroundColor: '$color',

  variants: {
    active: {
      true: {
        transform: [{ translateX: 20 }],
      },
      false: {
        transform: [{ translateX: 0 }],
      },
    },
  } as const,
})

interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Switch({ checked = false, onCheckedChange, label, disabled }: SwitchProps) {
  const handlePress = useCallback(() => {
    if (!disabled) onCheckedChange?.(!checked)
  }, [checked, onCheckedChange, disabled])

  return (
    <Stack flexDirection="row" alignItems="center" gap="$2">
      <SwitchTrack active={checked} disabled={disabled} onPress={handlePress}>
        <SwitchThumb active={checked} />
      </SwitchTrack>
      {label && (
        <TamaguiText fontFamily="$body" fontSize="$3" color="$color">
          {label}
        </TamaguiText>
      )}
    </Stack>
  )
}
