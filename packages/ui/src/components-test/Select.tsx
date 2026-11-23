import React, { useEffect, useRef, useState } from 'react'
import { Select as TamaguiSelect, useMedia } from 'tamagui'
import { Icon } from '../components/Icon'
import { Text } from '../components/Text'
import { XStack } from './Stacks'

export interface SelectOption {
  label: string
  value: string
  leading?: React.ReactNode
}

interface SelectProps {
  options: SelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  accessibilityLabel?: string
  testID?: string
}

export function Select(props: SelectProps) {
  const { sm } = useMedia()
  return <ResponsiveSelect key={String(sm)} {...props} />
}

function ResponsiveSelect({ options, value, onValueChange, placeholder = 'Select...', disabled, accessibilityLabel, testID }: SelectProps) {
  const selected = options.find((option) => option.value === value)
  const trigger = useRef<React.ElementRef<typeof TamaguiSelect.Trigger>>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || disabled || typeof window === 'undefined') return
    const restoreFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') window.setTimeout(() => trigger.current?.focus(), 0)
    }
    window.addEventListener('keydown', restoreFocus, true)
    return () => window.removeEventListener('keydown', restoreFocus, true)
  }, [open, disabled])

  return (
    <TamaguiSelect
      value={selected?.value ?? ''}
      onValueChange={onValueChange}
      open={open && !disabled}
      onOpenChange={setOpen}
    >
      <TamaguiSelect.Trigger
        ref={trigger}
        size="$4" minWidth={0} height={44} width="100%" gap="$1" paddingHorizontal="$2"
        backgroundColor="$backgroundInput" borderColor="$borderColor"
        focusStyle={{ borderColor: '$primary' }} opacity={disabled ? 0.5 : 1}
        disabled={disabled} aria-label={accessibilityLabel} testID={testID}
      >
        <XStack flex={1} minWidth={0} gap="$1" alignItems="center">
          {selected?.leading}
          <Text fontSize="$2" color={selected ? '$textColor' : '$secondaryColor'} numberOfLines={1}>
            {selected?.label ?? placeholder}
          </Text>
        </XStack>
        <Icon name="chevron-down" size="xs" color="muted" />
      </TamaguiSelect.Trigger>
      {/* Tamagui 1.121 checks string breakpoints at runtime, but does not type custom media keys. */}
      <TamaguiSelect.Adapt when={'sm' as unknown as React.ComponentProps<typeof TamaguiSelect.Adapt>['when']}>
        <TamaguiSelect.Sheet modal snapPointsMode="fit" dismissOnSnapToBottom>
          <TamaguiSelect.Sheet.Overlay backgroundColor="$backgroundOverlay" />
          <TamaguiSelect.Sheet.Frame backgroundColor="$backgroundSurface" padding="$3">
            {accessibilityLabel && <Text variant="label" padding="$2">{accessibilityLabel}</Text>}
            <TamaguiSelect.Adapt.Contents />
          </TamaguiSelect.Sheet.Frame>
        </TamaguiSelect.Sheet>
      </TamaguiSelect.Adapt>
      {/* Mount after opening: the v1 viewport cannot switch hook paths during adaptation. */}
      {open && !disabled && <TamaguiSelect.Content zIndex={200}>
        <TamaguiSelect.Viewport minWidth={160} backgroundColor="$backgroundSurface">
          <TamaguiSelect.Group>
            {options.map((option, index) => (
              <TamaguiSelect.Item
                key={option.value} index={index} value={option.value} role="option"
                backgroundColor={value === option.value ? '$backgroundHover' : '$backgroundSurface'}
                focusStyle={{ backgroundColor: '$backgroundHover' }}
              >
                {option.leading}
                <TamaguiSelect.ItemText flex={1} color="$textColor">{option.label}</TamaguiSelect.ItemText>
                <TamaguiSelect.ItemIndicator marginLeft="auto">
                  <Icon name="check" size="xs" color="primary" />
                </TamaguiSelect.ItemIndicator>
              </TamaguiSelect.Item>
            ))}
          </TamaguiSelect.Group>
        </TamaguiSelect.Viewport>
      </TamaguiSelect.Content>}
    </TamaguiSelect>
  )
}
