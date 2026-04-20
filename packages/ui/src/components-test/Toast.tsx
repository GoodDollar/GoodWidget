import React, { useEffect, useState, useCallback } from 'react'
import { Stack, Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'

const ToastFrame = createComponent(Stack, {
  name: 'Toast',
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: '$4',
  paddingVertical: '$3',
  borderRadius: '$2',
  backgroundColor: '$background',
  borderWidth: 1,
  borderColor: '$borderColor',
  shadowColor: '$shadowColor',
  shadowRadius: 8,
  shadowOpacity: 1,
  shadowOffset: { width: 0, height: 4 },
  gap: '$2',

  variants: {
    type: {
      success: { borderColor: '$green8' },
      error: { borderColor: '$red8' },
      warning: { borderColor: '$yellow8' },
      info: { borderColor: '$blue8' },
    },
  } as const,

  defaultVariants: {
    type: 'info',
  },
})

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onDismiss?: () => void
  visible?: boolean
}

export function Toast({ message, type = 'info', duration = 3000, onDismiss, visible = true }: ToastProps) {
  const [show, setShow] = useState(visible)

  useEffect(() => {
    setShow(visible)
  }, [visible])

  useEffect(() => {
    if (!show || duration <= 0) return
    const timer = setTimeout(() => {
      setShow(false)
      onDismiss?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [show, duration, onDismiss])

  if (!show) return null

  return (
    <ToastFrame type={type}>
      <TamaguiText fontFamily="$body" fontSize="$3" color="$color" flex={1}>
        {message}
      </TamaguiText>
      <Stack cursor="pointer" onPress={() => { setShow(false); onDismiss?.() }}>
        <TamaguiText fontSize="$2" color="$placeholderColor">
          ✕
        </TamaguiText>
      </Stack>
    </ToastFrame>
  )
}
