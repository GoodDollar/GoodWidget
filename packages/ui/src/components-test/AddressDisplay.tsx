import React, { useCallback, useState } from 'react'
import { Stack, Text as TamaguiText } from 'tamagui'
import { copyTextToClipboard } from '../clipboard'
import { createComponent } from '../createComponent'

const AddressFrame = createComponent(Stack, {
  name: 'AddressDisplay',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$2',
  cursor: 'pointer',

  variants: {
    size: {
      sm: {},
      md: {},
      lg: {},
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
})

function truncateAddress(address: string, startLen = 6, endLen = 4): string {
  if (address.length <= startLen + endLen + 2) return address
  return `${address.slice(0, startLen)}...${address.slice(-endLen)}`
}

interface AddressDisplayProps {
  address: string
  ensName?: string
  truncate?: boolean
  copyable?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function AddressDisplay({
  address,
  ensName,
  truncate = true,
  copyable = true,
  size = 'md',
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false)
  const fontSize = size === 'sm' ? '$1' : size === 'lg' ? '$4' : '$2'

  const handleCopy = useCallback(async () => {
    if (!copyable) return
    const copied = await copyTextToClipboard(address)
    if (!copied) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [address, copyable])

  const displayText = ensName ?? (truncate ? truncateAddress(address) : address)

  return (
    <AddressFrame size={size} onPress={handleCopy}>
      <TamaguiText fontFamily="$body" fontSize={fontSize} color="$color" fontWeight="500">
        {displayText}
      </TamaguiText>
      {copyable && (
        <TamaguiText fontSize="$1" color="$placeholderColor">
          {copied ? '✓' : '⧉'}
        </TamaguiText>
      )}
    </AddressFrame>
  )
}
