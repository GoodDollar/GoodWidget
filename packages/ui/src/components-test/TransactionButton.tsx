import React, { useState, useCallback } from 'react'
import { Stack, Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'
import { Spinner } from './Spinner'

export interface EIP1193Provider {
  request(args: { method: string; params?: readonly unknown[] | Record<string, unknown> }): Promise<unknown>
  on?(event: string, listener: (...args: unknown[]) => void): void
  removeListener?(event: string, listener: (...args: unknown[]) => void): void
}

type TxStatus = 'idle' | 'pending' | 'success' | 'error'

const TxButtonFrame = createComponent(Stack, {
  name: 'TransactionButton',
  tag: 'button',
  role: 'button',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$background',
  borderRadius: '$2',
  paddingHorizontal: '$5',
  height: '$11',
  gap: '$2',
  cursor: 'pointer',
  borderWidth: 0,

  hoverStyle: {
    backgroundColor: '$backgroundHover',
  },
  pressStyle: {
    backgroundColor: '$backgroundPress',
    opacity: 0.9,
  },

  variants: {
    status: {
      idle: {},
      pending: { opacity: 0.8, cursor: 'wait' },
      success: { backgroundColor: '#4CAF50' },
      error: { backgroundColor: '#E53935' },
    },
    fullWidth: {
      true: { width: '100%' },
    },
    disabled: {
      true: { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' },
    },
  } as const,

  defaultVariants: {
    status: 'idle',
  },
})

const STATUS_LABELS: Record<TxStatus, string> = {
  idle: '',
  pending: 'Confirming...',
  success: 'Success!',
  error: 'Failed',
}

interface TransactionButtonProps {
  label: string
  onTransaction: (provider: EIP1193Provider) => Promise<string | void>
  provider?: EIP1193Provider | null
  fullWidth?: boolean
  disabled?: boolean
  successDuration?: number
}

export function TransactionButton({
  label,
  onTransaction,
  provider,
  fullWidth,
  disabled,
  successDuration = 2000,
}: TransactionButtonProps) {
  const [status, setStatus] = useState<TxStatus>('idle')

  const handlePress = useCallback(async () => {
    if (!provider || status === 'pending') return
    setStatus('pending')
    try {
      await onTransaction(provider)
      setStatus('success')
      setTimeout(() => setStatus('idle'), successDuration)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), successDuration)
    }
  }, [provider, onTransaction, status, successDuration])

  const displayLabel = status === 'idle' ? label : STATUS_LABELS[status]

  return (
    <TxButtonFrame
      status={status}
      fullWidth={fullWidth}
      disabled={disabled || status === 'pending' || !provider}
      onPress={handlePress}
    >
      {status === 'pending' && <Spinner size="sm" />}
      <TamaguiText fontFamily="$body" fontSize="$3" fontWeight="600" color="$color">
        {displayLabel}
      </TamaguiText>
    </TxButtonFrame>
  )
}
