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
        backgroundColor: '$successMuted',
        borderColor: '$success',
      },
      error: {
        backgroundColor: '$errorMuted',
        borderColor: '$error',
      },
      warning: {
        backgroundColor: '$warningMuted',
        borderColor: '$warning',
      },
      info: {
        backgroundColor: '$infoMuted',
        borderColor: '$primary',
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
