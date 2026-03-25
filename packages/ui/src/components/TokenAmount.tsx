import React from 'react'
import { Stack, Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'

const TokenAmountFrame = createComponent(Stack, {
  name: 'TokenAmount',
  flexDirection: 'row',
  alignItems: 'baseline',
  gap: '$1',

  variants: {
    size: {
      sm: {},
      md: {},
      lg: {},
      xl: {},
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
})

interface TokenAmountProps {
  amount: string | number
  token: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  decimals?: number
}

export function TokenAmount({ amount, token, size = 'md', decimals = 2 }: TokenAmountProps) {
  const sizeMap = { sm: '$3', md: '$5', lg: '$7', xl: '$9' } as const
  const symbolSize = { sm: '$2', md: '$3', lg: '$5', xl: '$7' } as const
  const fontSize = sizeMap[size]
  const symbolFontSize = symbolSize[size]

  const formatted =
    typeof amount === 'number' ? amount.toFixed(decimals) : parseFloat(amount).toFixed(decimals)

  return (
    <TokenAmountFrame size={size}>
      <TamaguiText fontFamily="$heading" fontSize={fontSize} fontWeight="700" color="$color">
        {formatted}
      </TamaguiText>
      <TamaguiText
        fontFamily="$body"
        fontSize={symbolFontSize}
        fontWeight="500"
        color="$placeholderColor"
      >
        {token}
      </TamaguiText>
    </TokenAmountFrame>
  )
}
