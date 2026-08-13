import React, { useState } from 'react'
import { Button, ButtonText, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import type { IconName } from '@goodwidget/ui'
import { truncateAddress } from './styles'

interface WalletChipProps {
  address: string | null
  onDisconnect?: () => Promise<void>
  /**
   * Label for the menu action. Defaults to "Disconnect", which only makes
   * sense when onDisconnect directly ends the wallet session. Integrators
   * whose onDisconnect instead opens a connection-management modal (e.g.
   * AppKit's Account view) should pass something like "Network settings" so
   * the action's label matches what it actually does.
   */
  disconnectLabel?: string
  /** Icon for the menu action, mirroring `disconnectLabel`. Defaults to 'log-out'. */
  disconnectIcon?: IconName
  /** When true, the chip no longer opens its menu and renders at reduced opacity. */
  disabled?: boolean
}

/**
 * Connected-wallet chip (status dot + truncated address + chevron) shared by
 * CampaignHeader and LeaderboardView so both headers stay identical instead
 * of duplicating the markup. Pressing the chip opens a single-action menu
 * (default "Disconnect", customizable via disconnectLabel/disconnectIcon —
 * see their doc comments), following the same relative/absolute positioning
 * pattern as InfoTooltip in ai-credits-widget rather than pulling in the
 * heavier Drawer/ActionSheet primitives for one menu item.
 */
export function WalletChip({
  address,
  onDisconnect,
  disconnectLabel = 'Disconnect',
  disconnectIcon = 'log-out',
  disabled = false,
}: WalletChipProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(null)

  return (
    <XStack position="relative" alignItems="center" opacity={disabled ? 0.5 : 1}>
      <XStack
        gap="$2"
        alignItems="center"
        paddingHorizontal="$3"
        paddingVertical="$2"
        borderRadius="$full"
        borderWidth={1}
        borderColor="$borderColor"
        cursor={disabled ? 'not-allowed' : 'pointer'}
        onPress={() => {
          if (disabled) return
          setDisconnectMessage(null)
          setIsMenuOpen((open) => !open)
        }}
        aria-label="Wallet options"
        aria-disabled={disabled}
      >
        <YStack width={8} height={8} borderRadius="$full" backgroundColor="$success" />
        <Text variant="label">{address ? truncateAddress(address) : ''}</Text>
        <Icon name="chevron-down" size="xs" color="muted" />
      </XStack>

      {/* Also gated on !disabled: if disabled flips true while the menu is
          already open, this stops rendering it (and its disconnect action)
          immediately, rather than leaving a stale open menu the disabled
          chip can no longer be pressed to close. */}
      {isMenuOpen && !disabled && (
        <>
          {/* Invisible full-viewport layer so any outside press closes the menu,
              same dismiss approach as ActionSheet's overlay. Sits below the menu
              itself in z-index so the menu's own press still reaches its button. */}
          <XStack
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            zIndex={100}
            onPress={() => setIsMenuOpen(false)}
          />
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
              onPress={async () => {
                if (!onDisconnect) {
                  setDisconnectMessage('Disconnect should be done in your wallets session')
                  return
                }
                setIsMenuOpen(false)
                await onDisconnect()
              }}
            >
              <Icon name={disconnectIcon} size="xs" color="muted" />
              <ButtonText>{disconnectLabel}</ButtonText>
            </Button>
            {disconnectMessage && (
              <Text variant="caption" tone="secondary" padding="$2">
                {disconnectMessage}
              </Text>
            )}
          </YStack>
        </>
      )}
    </XStack>
  )
}
