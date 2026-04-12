import React, { useState, useCallback } from 'react'
import { styled, Stack, Text as TamaguiText } from 'tamagui'
import type { GetProps } from 'tamagui'

const SelectFrame = styled(Stack, {
  name: 'Select',
  tag: 'button',
  role: 'listbox',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '$background',
  borderRadius: '$2',
  borderWidth: 1,
  borderColor: '$borderColor',
  paddingHorizontal: '$3',
  height: '$10',
  cursor: 'pointer',

  hoverStyle: {
    borderColor: '$borderColorHover',
  },
  focusStyle: {
    borderColor: '$borderColorFocus',
  },

  variants: {
    disabled: {
      true: { opacity: 0.5, cursor: 'not-allowed' },
    },
  } as const,
})

const OptionItem = styled(Stack, {
  name: 'SelectOption',
  tag: 'button',
  role: 'option',
  paddingHorizontal: '$3',
  paddingVertical: '$2',
  cursor: 'pointer',
  backgroundColor: '$background',

  hoverStyle: {
    backgroundColor: '$backgroundHover',
  },
})

export interface SelectOption {
  label: string
  value: string
}

interface SelectProps {
  options: SelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function Select({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  disabled,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  const handleSelect = useCallback(
    (optionValue: string) => {
      onValueChange?.(optionValue)
      setOpen(false)
    },
    [onValueChange],
  )

  return (
    <Stack position="relative">
      <SelectFrame disabled={disabled} onPress={() => setOpen(!open)}>
        <TamaguiText
          color={selected ? '$color' : '$placeholderColor'}
          fontFamily="$body"
          fontSize="$3"
        >
          {selected?.label ?? placeholder}
        </TamaguiText>
        <TamaguiText color="$placeholderColor" fontSize="$2">
          {open ? '▲' : '▼'}
        </TamaguiText>
      </SelectFrame>

      {open && (
        <Stack
          position="absolute"
          top="100%"
          left={0}
          right={0}
          backgroundColor="$background"
          borderRadius="$2"
          borderWidth={1}
          borderColor="$borderColor"
          shadowColor="$shadowColor"
          shadowRadius={8}
          shadowOpacity={1}
          shadowOffset={{ width: 0, height: 4 }}
          zIndex={100}
          marginTop="$1"
          overflow="hidden"
        >
          {options.map((option) => (
            <OptionItem key={option.value} onPress={() => handleSelect(option.value)}>
              <TamaguiText fontFamily="$body" fontSize="$3" color="$color">
                {option.label}
              </TamaguiText>
            </OptionItem>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
