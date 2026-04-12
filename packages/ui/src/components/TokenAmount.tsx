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

const TokenAmountText = createComponent(TamaguiText, {
  name: 'TokenAmountText',
  fontFamily: '$body',
  fontWeight: '700',
  color: '$color',

  variants: {
    size: {
      sm: { fontSize: '$2' },
      md: { fontSize: '$3' },
      lg: { fontSize: '$5' },
      xl: { fontSize: '$7' },
    },
    variant: {
      secondary: {
        color: '$secondaryColor',
        fontWeight: 500,
      },
    },
  } as const,
})

interface TokenAmountProps {
  amount: string | number
  token: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  decimals?: number
  variant?: 'secondary'
}

export function TokenAmount({
  amount,
  token,
  size = 'md',
  decimals = 2,
  variant,
}: TokenAmountProps) {
  const sizeMap = { sm: '$3', md: '$5', lg: '$7', xl: '$9' } as const
  const symbolSize = { sm: '$2', md: '$3', lg: '$5', xl: '$7' } as const
  const fontSize = sizeMap[size]
  const symbolFontSize = symbolSize[size]

  const formatted =
    typeof amount === 'number' ? amount.toFixed(decimals) : parseFloat(amount).toFixed(decimals)

  return (
    <TokenAmountFrame size={size}>
      <TokenAmountText fontFamily="$heading" fontSize={fontSize} variant={variant}>
        {formatted}
      </TokenAmountText>
      <TokenAmountText
        fontFamily="$body"
        fontSize={symbolFontSize}
        fontWeight="500"
        color="$placeholderColor"
      >
        {token}
      </TokenAmountText>
    </TokenAmountFrame>
  )
}
