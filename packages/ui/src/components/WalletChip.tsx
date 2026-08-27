import React, { useEffect, useState } from 'react'
import { Button, ButtonText } from './Button'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { Text } from './Text'
import { XStack, YStack } from '../components-test/Stacks'

/** Compact form used inside dense widget headers. */
function shortAddress(address: string): string {
  return `${address.slice(0, 5)}…${address.slice(-3)}`
}

/** Roomier form used where the chip sits on its own. */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const SIZES = {
  sm: {
    gap: '$1.5',
    paddingHorizontal: '$2',
    paddingVertical: '$1',
    dot: 6,
    chevron: '2xs',
    menuMinWidth: 132,
    format: shortAddress,
  },
  md: {
    gap: '$2',
    paddingHorizontal: '$3',
    paddingVertical: '$2',
    dot: 8,
    chevron: 'xs',
    menuMinWidth: 160,
    format: truncateAddress,
  },
} as const

export interface WalletChipProps {
  address: string | null
  /**
   * Whether the session can be ended from here. When false the menu explains
   * that the wallet owns the session instead of offering an action that cannot
   * fire — an injected provider has no disconnect method to call.
   */
  canDisconnect?: boolean
  onDisconnect?: () => Promise<void>
  /**
   * Label for the menu action. Defaults to "Disconnect", which only makes sense
   * when onDisconnect directly ends the wallet session. An onDisconnect that
   * instead opens a connection-management modal (e.g. AppKit's Account view)
   * should pass something like "Network settings" so the label matches.
   */
  disconnectLabel?: string
  /** Icon for the menu action, mirroring `disconnectLabel`. Defaults to 'log-out'. */
  disconnectIcon?: IconName
  /** Shown in place of the action when `canDisconnect` is false. */
  unavailableMessage?: string
  /** When true, the chip no longer opens its menu and renders at reduced opacity. */
  disabled?: boolean
  /** `sm` for dense headers, `md` when the chip stands alone. Defaults to `md`. */
  size?: keyof typeof SIZES
}

/**
 * Connected-wallet chip: status dot, truncated address, chevron. Pressing it
 * opens a single-action menu.
 *
 * Presentational only — it takes `canDisconnect` rather than reading wallet
 * context, because @goodwidget/core depends on this package and not the other
 * way round. `WalletControls` in core is the context-aware wrapper; prefer that
 * in widgets and reach for this directly only when the wallet state comes from
 * somewhere other than the provider.
 *
 * Uses the same relative/absolute menu positioning as InfoTooltip rather than
 * pulling in the heavier Drawer/ActionSheet primitives for one menu item.
 */
export function WalletChip({
  address,
  canDisconnect = false,
  onDisconnect,
  disconnectLabel = 'Disconnect',
  disconnectIcon = 'log-out',
  unavailableMessage = 'To disconnect, use your wallet.',
  disabled = false,
  size = 'md',
}: WalletChipProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const style = SIZES[size]

  // Resets the open state itself (not just its render) when disabled turns
  // true, so re-enabling later starts from closed instead of the menu
  // silently reappearing from whatever state it was left in.
  useEffect(() => {
    if (disabled) setIsMenuOpen(false)
  }, [disabled])

  const canAct = canDisconnect && Boolean(onDisconnect)

  return (
    <XStack position="relative" alignItems="center" opacity={disabled ? 0.5 : 1}>
      <XStack
        gap={style.gap}
        alignItems="center"
        paddingHorizontal={style.paddingHorizontal}
        paddingVertical={style.paddingVertical}
        borderRadius="$full"
        borderWidth={1}
        borderColor="$borderColor"
        cursor={disabled ? 'not-allowed' : 'pointer'}
        onPress={() => {
          if (disabled) return
          setIsMenuOpen((open) => !open)
        }}
        aria-label="Wallet options"
        aria-disabled={disabled}
      >
        <YStack
          width={style.dot}
          height={style.dot}
          borderRadius="$full"
          backgroundColor="$success"
        />
        {size === 'sm' ? (
          <Text fontSize="$1" numberOfLines={1}>
            {address ? style.format(address) : ''}
          </Text>
        ) : (
          <Text variant="label">{address ? style.format(address) : ''}</Text>
        )}
        <Icon name="chevron-down" size={style.chevron} color="muted" />
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
            minWidth={style.menuMinWidth}
            zIndex={101}
          >
            {canAct ? (
              <Button
                size="sm"
                variant="list"
                {...(size === 'sm'
                  ? { height: '$6' as const, paddingHorizontal: '$2' as const, gap: '$1.5' as const }
                  : {})}
                onPress={async () => {
                  setIsMenuOpen(false)
                  await onDisconnect?.()
                }}
              >
                <Icon name={disconnectIcon} size="xs" color="muted" />
                <ButtonText {...(size === 'sm' ? { fontSize: '$2' as const } : {})}>
                  {disconnectLabel}
                </ButtonText>
              </Button>
            ) : (
              <Text variant="caption" secondary padding="$2">
                {unavailableMessage}
              </Text>
            )}
          </YStack>
        </>
      )}
    </XStack>
  )
}
