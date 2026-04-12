import React from 'react'
import { Stack, Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'
import { AddressDisplay } from './AddressDisplay'
import { ChainBadge } from './ChainBadge'

const WalletInfoFrame = createComponent(Stack, {
  name: 'WalletInfo',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: '$3',
  paddingVertical: '$2',
  borderRadius: '$2',
  backgroundColor: '$backgroundHover',
  gap: '$3',
})

interface WalletInfoProps {
  address: string | null
  chainId: number | null
  ensName?: string
}

export function WalletInfo({ address, chainId, ensName }: WalletInfoProps) {
  if (!address) {
    return (
      <WalletInfoFrame>
        <TamaguiText fontFamily="$body" fontSize="$2" color="$placeholderColor">
          Not connected
        </TamaguiText>
      </WalletInfoFrame>
    )
  }

  return (
    <WalletInfoFrame>
      <AddressDisplay address={address} ensName={ensName} size="sm" />
      {chainId !== null && <ChainBadge chainId={chainId} />}
    </WalletInfoFrame>
  )
}
