import type { ChangeEvent } from 'react'
import { TextArea } from 'tamagui'
import { createComponent, InputError, InputLabel, Text, YStack } from '@goodwidget/ui'

/**
 * ProfileTextAreaFrame — styled base for the profile text area.
 * Named 'ProfileTextAreaField' so Tamagui resolves the
 * light_ProfileTextAreaField / dark_ProfileTextAreaField component sub-themes
 * defined in the preset. All visual values come from the active theme —
 * no hardcoded hex colors here.
 */
const ProfileTextAreaFrame = createComponent(TextArea, {
  name: 'ProfileTextAreaField',
  minHeight: 112,
  borderRadius: '$2',
  borderWidth: 1,
  borderColor: '$borderColor',
  paddingHorizontal: '$3',
  paddingVertical: '$3',
  backgroundColor: '$background',
  color: '$color',
  fontFamily: '$body',
  fontSize: '$3',
  lineHeight: '$4',
  outlineWidth: 0,

  hoverStyle: {
    borderColor: '$borderColorHover',
  },
  focusStyle: {
    borderColor: '$borderColorFocus',
    shadowColor: '$shadowColorFocus',
    shadowRadius: 4,
    shadowOpacity: 1,
  },

  variants: {
    error: {
      true: {
        borderColor: '$error',
        hoverStyle: { borderColor: '$error' },
        focusStyle: {
          borderColor: '$error',
          shadowColor: '$shadowColorFocus',
          shadowRadius: 4,
          shadowOpacity: 1,
        },
      },
    },
  } as const,
})

interface ProfileTextAreaFieldProps {
  label: string
  placeholder: string
  value?: string
  helperText?: string
  errorMessage?: string
  onChangeText: (nextValue: string) => void
}

export function ProfileTextAreaField({
  label,
  placeholder,
  value,
  helperText,
  errorMessage,
  onChangeText,
}: ProfileTextAreaFieldProps) {
  return (
    <YStack gap="$1">
      <InputLabel>{label}</InputLabel>
      <ProfileTextAreaFrame
        error={Boolean(errorMessage)}
        value={value ?? ''}
        placeholder={placeholder}
        numberOfLines={4}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
          onChangeText(event.currentTarget.value)
        }}
      />
      {helperText ? <Text variant="caption">{helperText}</Text> : null}
      {errorMessage ? <InputError>{errorMessage}</InputError> : null}
    </YStack>
  )
}
