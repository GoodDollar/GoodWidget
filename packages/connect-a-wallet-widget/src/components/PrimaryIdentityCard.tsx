import React, { useState } from 'react'
import { AddressDisplay, GlowCard, Icon, Text, XStack, YStack, copyTextToClipboard } from '@goodwidget/ui'

interface PrimaryIdentityCardProps {
  walletAddress: string | null
}

/**
 * Shows which address the per-chain rows below are linking *from* — the
 * connected host wallet, i.e. the user's GoodID primary identity. Mirrors
 * the "Primary Verified Identity" card in the #113 design reference.
 */
export function PrimaryIdentityCard({ walletAddress }: PrimaryIdentityCardProps) {
  const [copied, setCopied] = useState(false)

  if (!walletAddress) {
    return null
  }

  const handleCopy = async () => {
    const success = await copyTextToClipboard(walletAddress)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <GlowCard
      data-testid="connect-a-wallet-widget-primary-identity"
      padding="$4"
      borderRadius="$3"
    >
      <XStack alignItems="center" gap="$3" width="100%">
        <YStack
          width={40}
          height={40}
          borderRadius="$2"
          backgroundColor="rgba(0, 174, 255, 0.15)"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <Icon name="shield-check" size="md" color="primary" />
        </YStack>
        <YStack flex={1} gap="$0.5" justifyContent="center" alignItems="center" minWidth={0}>
          <Text
            fontSize="$1"
            fontWeight="800"
            letterSpacing={0.5}
            color="$primary"
            textTransform="uppercase"
            numberOfLines={1}
          >
            Primary Verified Identity
          </Text>
          <AddressDisplay address={walletAddress} size="sm" copyable={false} />
        </YStack>
        <YStack
          onPress={handleCopy}
          cursor="pointer"
          padding="$1"
          hoverStyle={{ opacity: 0.7 }}
          flexShrink={0}
        >
          <Icon name={copied ? 'check' : 'copy'} size="md" color={copied ? 'success' : 'muted'} />
        </YStack>
      </XStack>
    </GlowCard>
  )
}
