import React from 'react'
import { Stack, Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'

const ChainBadgeFrame = createComponent(Stack, {
  name: 'ChainBadge',
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$6',
  backgroundColor: '$backgroundHover',
  gap: '$1',
})

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  10: 'Optimism',
  42161: 'Arbitrum',
  42220: 'Celo',
  44787: 'Celo Alfajores',
  137: 'Polygon',
  8453: 'Base',
  480: 'World Chain',
  122: 'Fuse',
}

interface ChainBadgeProps {
  chainId: number
  name?: string
}

export function ChainBadge({ chainId, name }: ChainBadgeProps) {
  const chainName = name ?? CHAIN_NAMES[chainId] ?? `Chain ${chainId}`

  return (
    <ChainBadgeFrame>
      <Stack width={8} height={8} borderRadius={4} backgroundColor="$color" opacity={0.6} />
      <TamaguiText fontFamily="$body" fontSize="$1" fontWeight="500" color="$color">
        {chainName}
      </TamaguiText>
    </ChainBadgeFrame>
  )
}
