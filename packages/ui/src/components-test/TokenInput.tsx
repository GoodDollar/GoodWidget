import React, { useCallback } from 'react'
import { Stack, Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'

const TokenInputFrame = createComponent(Stack, {
  name: 'TokenInput',
  backgroundColor: '$background',
  borderRadius: '$3',
  borderWidth: 1,
  borderColor: '$borderColor',
  padding: '$3',
  gap: '$2',

  focusStyle: {
    borderColor: '$borderColorFocus',
  },
})

const AmountInput = createComponent(Stack, {
  name: 'TokenInputAmount',
  tag: 'input',
  flex: 1,
  fontFamily: '$heading',
  fontSize: '$7',
  fontWeight: '700',
  color: '$color',
  backgroundColor: '$backgroundTransparent',
  borderWidth: 0,
  outlineWidth: 0,
  padding: 0,
})

interface TokenInputProps {
  value: string
  onChangeText: (value: string) => void
  token: string
  balance?: string
  onMax?: () => void
}

export function TokenInput({ value, onChangeText, token, balance, onMax }: TokenInputProps) {
  const handleMax = useCallback(() => {
    onMax?.()
  }, [onMax])

  return (
    <TokenInputFrame>
      <Stack flexDirection="row" alignItems="center" justifyContent="space-between">
        <TamaguiText fontFamily="$body" fontSize="$2" color="$placeholderColor">
          Amount
        </TamaguiText>
        {balance !== undefined && (
          <Stack flexDirection="row" alignItems="center" gap="$1">
            <TamaguiText fontFamily="$body" fontSize="$2" color="$placeholderColor">
              Balance: {balance}
            </TamaguiText>
            {onMax && (
              <Stack
                tag="button"
                cursor="pointer"
                paddingHorizontal="$1"
                onPress={handleMax}
              >
                <TamaguiText
                  fontFamily="$body"
                  fontSize="$1"
                  fontWeight="600"
                  color="$color"
                >
                  MAX
                </TamaguiText>
              </Stack>
            )}
          </Stack>
        )}
      </Stack>

      <Stack flexDirection="row" alignItems="center" gap="$2">
        <AmountInput
          value={value}
          placeholder="0.00"
          onChangeText={onChangeText}
        />
        <Stack
          paddingHorizontal="$3"
          paddingVertical="$2"
          borderRadius="$6"
          backgroundColor="$backgroundHover"
        >
          <TamaguiText fontFamily="$body" fontSize="$3" fontWeight="600" color="$color">
            {token}
          </TamaguiText>
        </Stack>
      </Stack>
    </TokenInputFrame>
  )
}
