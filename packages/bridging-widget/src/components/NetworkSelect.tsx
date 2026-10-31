import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
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
  const listboxId = useId()
  const containerRef = useRef<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const optionRefs = useRef<Array<HTMLElement | null>>([])
  const optionsRef = useRef(options)
  optionsRef.current = options
  const valueRef = useRef(value)
  valueRef.current = value
  const selected = options.find((option) => option.value === value)
  const handleSelect = useCallback((optionValue: string) => {
    onValueChange(optionValue)
    setOpen(false)
    triggerRef.current?.focus()
  }, [onValueChange])

  useEffect(() => {
    if (!open || typeof document === 'undefined') return

    optionRefs.current[Math.max(0, optionsRef.current.findIndex((option) => option.value === valueRef.current))]?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      } else if (optionsRef.current.length > 0 && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        const index = optionRefs.current.indexOf(document.activeElement as HTMLElement)
        if (index < 0) return
        event.preventDefault()
        const offset = event.key === 'ArrowDown' ? 1 : -1
        optionRefs.current[(index + offset + optionsRef.current.length) % optionsRef.current.length]?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <Stack ref={(node) => { containerRef.current = node as HTMLElement | null }} position="relative">
      <Stack
        ref={(node) => { triggerRef.current = node as HTMLElement | null }}
        tag="button"
        role="button"
        aria-label={accessibilityLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
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
          id={listboxId}
          role="listbox"
          aria-label={accessibilityLabel}
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
          {options.map((option, index) => (
            <Stack
              key={option.value}
              ref={(node) => { optionRefs.current[index] = node as HTMLElement | null }}
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
