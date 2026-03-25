import React from 'react'
import { Stack, Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'

const AlertFrame = createComponent(Stack, {
  name: 'Alert',
  flexDirection: 'row',
  alignItems: 'flex-start',
  padding: '$3',
  borderRadius: '$2',
  borderWidth: 1,
  gap: '$2',

  variants: {
    type: {
      success: {
        backgroundColor: '#E8F5E9',
        borderColor: '#4CAF50',
      },
      error: {
        backgroundColor: '#FFEBEE',
        borderColor: '#E53935',
      },
      warning: {
        backgroundColor: '#FFF8E1',
        borderColor: '#F5A623',
      },
      info: {
        backgroundColor: '#E3F2FD',
        borderColor: '#2196F3',
      },
    },
  } as const,

  defaultVariants: {
    type: 'info',
  },
})

const ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

interface AlertProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  title?: string
}

export function Alert({ message, type = 'info', title }: AlertProps) {
  return (
    <AlertFrame type={type}>
      <TamaguiText fontSize="$3">{ICONS[type]}</TamaguiText>
      <Stack flex={1} gap="$1">
        {title && (
          <TamaguiText fontFamily="$body" fontSize="$3" fontWeight="600" color="$color">
            {title}
          </TamaguiText>
        )}
        <TamaguiText fontFamily="$body" fontSize="$2" color="$color">
          {message}
        </TamaguiText>
      </Stack>
    </AlertFrame>
  )
}
