import type React from 'react'

type CrossPlatformInputEvent = React.ChangeEvent<HTMLInputElement> & {
  nativeEvent?: { text?: string }
}

function readInputText(eventOrText: CrossPlatformInputEvent | string): string {
  if (typeof eventOrText === 'string') return eventOrText
  return eventOrText.currentTarget?.value ?? eventOrText.nativeEvent?.text ?? ''
}

export function createInputChangeHandlers(options: {
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  onChangeText?: (text: string) => void
}) {
  const { onChange, onChangeText } = options

  const handleChangeText = (text: string) => {
    if (typeof onChangeText === 'function') {
      onChangeText(text)
    }
  }

  const handleChange = (event: CrossPlatformInputEvent) => {
    if (typeof onChange === 'function') {
      onChange(event)
    }
    if (typeof onChangeText === 'function') {
      onChangeText(readInputText(event))
    }
  }

  return {
    onChange: handleChange,
    onChangeText: handleChangeText,
  }
}
