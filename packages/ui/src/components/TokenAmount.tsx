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
  color: '$text',

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
  useAbbreviations?: boolean
}

const getDecimals = (value: number): number => {
  const absValue = Math.abs(value)
  if (absValue >= 1 || absValue === 0) return 2
  if (absValue >= 0.1) return 3
  if (absValue >= 0.01) return 4
  if (absValue >= 0.001) return 5
  if (absValue >= 0.0001) return 6
  if (absValue >= 0.00001) return 7
  if (absValue >= 0.000001) return 8
  if (absValue >= 0.0000001) return 9
  return 10
}

export function TokenAmount({
  amount,
  token,
  size = 'md',
  decimals = 2,
  variant,
  useAbbreviations = true,
}: TokenAmountProps) {
  const fontSize = { sm: '$3', md: '$5', lg: '$7', xl: '$9' } as const

  const amountNumber = typeof amount === 'number' ? amount : parseFloat(amount)
  const formatted = useAbbreviations
    ? new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: getDecimals(amountNumber),
        useGrouping: true,
        notation: 'compact',
      }).format(amountNumber)
    : amountNumber.toFixed(decimals)

  return (
    <TokenAmountFrame size={size}>
      <TokenAmountText fontFamily="$body" fontSize={fontSize[size]} variant={variant}>
        {formatted}
      </TokenAmountText>
      <TokenAmountText fontFamily="$body" fontSize={fontSize[size]} fontWeight="500">
        {token}
      </TokenAmountText>
    </TokenAmountFrame>
  )
}
