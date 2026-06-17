import React from 'react'
import { InputError, InputFrame, InputLabel, Text, YStack } from '@goodwidget/ui'

interface ProfileFieldProps {
  label: string
  placeholder: string
  value?: string
  helperText?: string
  errorMessage?: string
  onChangeText: (nextValue: string) => void
}

export function ProfileField({
  label,
  placeholder,
  value,
  helperText,
  errorMessage,
  onChangeText,
}: ProfileFieldProps) {
  return (
    <YStack gap="$1">
      <InputLabel>{label}</InputLabel>
      <InputFrame
        placeholder={placeholder}
        value={value ?? ''}
        error={Boolean(errorMessage)}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          onChangeText(event.currentTarget.value)
        }}
      />
      {errorMessage ? <InputError>{errorMessage}</InputError> : null}
      {helperText ? <Text variant="caption">{helperText}</Text> : null}
    </YStack>
  )
}
