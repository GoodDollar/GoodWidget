import React from 'react'
import { TextArea } from 'tamagui'
import { InputError, InputLabel, Text, YStack } from '@goodwidget/ui'

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
      <TextArea
        value={value ?? ''}
        placeholder={placeholder}
        numberOfLines={4}
        minHeight={112}
        borderRadius="$2"
        borderWidth={1}
        borderColor={errorMessage ? '$error' : '$borderColor'}
        paddingHorizontal="$3"
        paddingVertical="$3"
        backgroundColor="$background"
        color="$color"
        fontFamily="$body"
        fontSize="$3"
        lineHeight="$4"
        outlineWidth={0}
        hoverStyle={{
          borderColor: errorMessage ? '$error' : '$borderColorHover',
        }}
        focusStyle={{
          borderColor: errorMessage ? '$error' : '$borderColorFocus',
          shadowColor: '$shadowColorFocus',
          shadowRadius: 4,
          shadowOpacity: 1,
        }}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
          onChangeText(event.currentTarget.value)
        }}
      />
      {helperText ? <Text variant="caption">{helperText}</Text> : null}
      {errorMessage ? <InputError>{errorMessage}</InputError> : null}
    </YStack>
  )
}
