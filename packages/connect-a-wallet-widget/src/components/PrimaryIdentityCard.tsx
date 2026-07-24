import React from 'react'
import { AddressDisplay, Icon, Text, XStack, YStack, createComponent } from '@goodwidget/ui'

const IdentityIconBadge = createComponent(YStack, {
  name: 'PrimaryIdentityIconBadge',
  width: 36,
  height: 36,
  borderRadius: '$full',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$infoMuted',
})

const IdentityCard = createComponent(XStack, {
  name: 'PrimaryIdentityCard',
  alignItems: 'center',
  gap: '$3',
  padding: '$3',
  borderRadius: '$3',
  borderWidth: 1,
  borderColor: '$borderColor',
})

interface PrimaryIdentityCardProps {
  walletAddress: string | null
}

/**
 * Shows which address the per-chain rows below are linking *from* — the
 * connected host wallet, i.e. the user's GoodID primary identity. Mirrors
 * the "Primary Verified Identity" card in the #113 design reference.
 */
export function PrimaryIdentityCard({ walletAddress }: PrimaryIdentityCardProps) {
  if (!walletAddress) {
    return null
  }

  return (
    <IdentityCard data-testid="connect-a-wallet-widget-primary-identity">
      <IdentityIconBadge>
        <Icon name="shield-check" size="sm" color="primary" />
      </IdentityIconBadge>
      <YStack flex={1} gap="$0.5">
        <Text
          variant="label"
          color="$primary"
          fontWeight="700"
          textTransform="uppercase"
          letterSpacing={0.5}
        >
          Primary verified identity
        </Text>
        <AddressDisplay address={walletAddress} size="sm" />
      </YStack>
    </IdentityCard>
  )
}
