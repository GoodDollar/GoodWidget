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
  maxSignificantDigits?: number
}

export function formatDisplayAmount(
  amount: string | number,
  {
    decimals = 2,
    useAbbreviations = true,
    maxSignificantDigits = 6,
  }: {
    decimals?: number
    useAbbreviations?: boolean
    maxSignificantDigits?: number
  } = {},
): string {
  const amountNumber = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(amountNumber)) return String(amount)
  if (!useAbbreviations) return amountNumber.toFixed(decimals)

  return new Intl.NumberFormat('en-US', {
    maximumSignificantDigits: maxSignificantDigits,
    minimumFractionDigits: 0,
    notation: Math.abs(amountNumber) >= 1_000_000 ? 'compact' : 'standard',
    useGrouping: true,
  }).format(amountNumber)
}

export function TokenAmount({
  amount,
  token,
  size = 'md',
  decimals = 2,
  variant,
  useAbbreviations = true,
  maxSignificantDigits = 6,
}: TokenAmountProps) {
  const fontSize = { sm: '$3', md: '$5', lg: '$7', xl: '$9' } as const

  const formatted = formatDisplayAmount(amount, {
    decimals,
    useAbbreviations,
    maxSignificantDigits,
  })

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
