import React, { useState } from 'react'
import { Button, ButtonText, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import { truncateAddress } from './styles'

interface WalletChipProps {
  address: string | null
  onDisconnect: () => void
}

/**
 * Connected-wallet chip (status dot + truncated address + chevron) shared by
 * CampaignHeader and LeaderboardView so both headers stay identical instead
 * of duplicating the markup. Pressing the chip opens a single-action
 * "Disconnect" dropdown, following the same relative/absolute positioning
 * pattern as InfoTooltip in ai-credits-widget rather than pulling in the
 * heavier Drawer/ActionSheet primitives for one menu item.
 */
export function WalletChip({ address, onDisconnect }: WalletChipProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <XStack position="relative" alignItems="center">
      <XStack
        gap="$2"
        alignItems="center"
        paddingHorizontal="$3"
        paddingVertical="$2"
        borderRadius="$full"
        borderWidth={1}
        borderColor="$borderColor"
        cursor="pointer"
        onPress={() => setIsMenuOpen((open) => !open)}
        aria-label="Wallet options"
      >
        <YStack width={8} height={8} borderRadius="$full" backgroundColor="$success" />
        <Text variant="label">{address ? truncateAddress(address) : ''}</Text>
        <Icon name="chevron-down" size="xs" color="muted" />
      </XStack>

      {isMenuOpen && (
        <>
          {/* Invisible full-viewport layer so any outside press closes the menu,
              same dismiss approach as ActionSheet's overlay. Sits below the menu
              itself in z-index so the menu's own press still reaches its button. */}
          <XStack position="fixed" top={0} left={0} right={0} bottom={0} zIndex={100} onPress={() => setIsMenuOpen(false)} />
          <YStack
            position="absolute"
            top="100%"
            right={0}
            marginTop="$1"
            backgroundColor="$background"
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius="$3"
            padding="$1"
            minWidth={160}
            zIndex={101}
          >
            <Button
              size="sm"
              variant="list"
              onPress={() => {
                setIsMenuOpen(false)
                onDisconnect()
              }}
            >
              <Icon name="log-out" size="xs" color="muted" />
              <ButtonText>Disconnect</ButtonText>
            </Button>
          </YStack>
        </>
      )}
    </XStack>
  )
}
