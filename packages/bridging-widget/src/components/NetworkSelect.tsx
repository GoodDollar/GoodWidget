import React, { useCallback, useState } from 'react'
import { Stack, Text } from '@goodwidget/ui'

interface NetworkSelectProps {
  accessibilityLabel: string
  testID: string
  options: Array<{ label: string; value: string }>
  value?: string
  placeholder?: string
  onValueChange: (value: string) => void
}

export function NetworkSelect({
  accessibilityLabel,
  testID,
  options,
  value,
  placeholder = 'Select...',
  onValueChange,
}: NetworkSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)
  const handleSelect = useCallback((optionValue: string) => {
    onValueChange(optionValue)
    setOpen(false)
  }, [onValueChange])

  return (
    <Stack position="relative">
      <Stack
        tag="button"
        role="button"
        aria-label={accessibilityLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        data-testid={testID}
        onPress={() => setOpen(!open)}
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        backgroundColor="$background"
        borderRadius="$2"
        borderWidth={1}
        borderColor="$borderColor"
        paddingHorizontal="$3"
        height="$10"
        cursor="pointer"
        hoverStyle={{ borderColor: '$borderColorHover' }}
        focusStyle={{ borderColor: '$borderColorFocus' }}
      >
        <Text color={selected ? '$color' : '$placeholderColor'} fontFamily="$body" fontSize="$3">
          {selected?.label ?? placeholder}
        </Text>
        <Text color="$placeholderColor" fontSize="$2">
          {open ? '▲' : '▼'}
        </Text>
      </Stack>

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
            <Stack
              key={option.value}
              tag="button"
              role="option"
              aria-selected={option.value === value}
              onPress={() => handleSelect(option.value)}
              paddingHorizontal="$3"
              paddingVertical="$2"
              cursor="pointer"
              backgroundColor="$background"
              hoverStyle={{ backgroundColor: '$backgroundHover' }}
            >
              <Text fontFamily="$body" fontSize="$3" color="$color">
                {option.label}
              </Text>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
