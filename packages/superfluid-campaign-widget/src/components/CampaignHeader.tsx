import React from 'react'
import { Badge, BadgeText, Button, ButtonText, Heading, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import type { IconName } from '@goodwidget/ui'
import type { CampaignDefinition } from '../widgetRuntimeContract'
import { ConnectWalletPrompt } from './ConnectWalletPrompt'
import { compactButtonProps } from './shared/styles'
import { WalletChip } from './shared/WalletChip'

/** claim.superfluid.org is the Superfluid-operated claim app — always opened in a new tab, never embedded. */
const SUPERFLUID_CLAIM_APP_URL = 'https://claim.superfluid.org/'

interface CampaignHeaderProps {
  data: Pick<
    CampaignDefinition,
    'seasonLabel' | 'title' | 'description' | 'supAllocatedLabel' | 'endsLabel'
  >
  address: string | null
  isConnected: boolean
  onConnect: () => void
  onDisconnect?: () => Promise<void>
  /** Label for the WalletChip's disconnect action. See WalletChip's own prop for details. */
  disconnectLabel?: string
  /** Icon for the WalletChip's disconnect action. See WalletChip's own prop for details. */
  disconnectIcon?: IconName
  /** Present when the campaign shell is showing an in-place child widget. */
  onClose?: () => void
}

/**
 * Top-of-page header: "Superfluid" wordmark + season badge, top-right slot,
 * title, description, and configured campaign-info pills. The top-right slot shows the
 * "Connect wallet" CTA while disconnected, per #127 follow-up, and the same
 * WalletChip (status dot + truncated address + dropdown chevron, opening a
 * Disconnect menu) used on LeaderboardView's header once connected. An
 * optional close affordance is supplied when this header frames an in-place
 * child widget, such as the Citizen Claim flow.
 */
export function CampaignHeader({
  data,
  address,
  isConnected,
  onConnect,
  onDisconnect,
  disconnectLabel,
  disconnectIcon,
  onClose,
}: CampaignHeaderProps) {
  return (
    <YStack gap="$4" width="100%">
      {/* Wraps below the wordmark/badge group on narrow viewports instead of staying
          rigid — without this, the disconnected-state CTA (or the connected-state wave
          art) is pushed past the card's right edge and silently clipped by the card's
          own rounded-corner overflow at sub-480px widths. */}
      <XStack
        justifyContent="space-between"
        alignItems="flex-start"
        width="100%"
        gap="$2"
        flexWrap="wrap"
      >
        <XStack gap="$2" alignItems="center">
          <Heading level={5}>Superfluid</Heading>
          <Badge type="info">
            <BadgeText>{data.seasonLabel}</BadgeText>
          </Badge>
        </XStack>

        <XStack gap="$2" alignItems="center">
          {isConnected ? (
            <WalletChip
              address={address}
              onDisconnect={onDisconnect}
              disconnectLabel={disconnectLabel}
              menuActionIcon={disconnectIcon}
            />
          ) : (
            <ConnectWalletPrompt onConnect={onConnect} />
          )}
          {onClose && (
            <Button
              size="sm"
              {...compactButtonProps}
              variant="ghost"
              iconSize="sm"
              onPress={onClose}
              aria-label="Close claim widget"
            >
              <Icon name="x" size="sm" />
            </Button>
          )}
        </XStack>
      </XStack>

      <YStack gap="$2">
        {/* Level 1 dominates the first screen on phone-width viewports, so it steps down
            to the level-3 scale there while staying the largest text on the page. */}
        <Heading level={1} $sm={{ fontSize: '$7', lineHeight: '$7', letterSpacing: '$7' }}>
          {data.title}
        </Heading>
        <Text tone="soft">{data.description}</Text>
      </YStack>

      <XStack gap="$2" alignItems="center" flexWrap="wrap" justifyContent="space-between">
        <XStack gap="$2" flexWrap="wrap">
          {data.supAllocatedLabel && (
            <Badge type="default">
              <BadgeText>{data.supAllocatedLabel}</BadgeText>
            </Badge>
          )}
          <Badge type="default">
            <BadgeText>{data.endsLabel}</BadgeText>
          </Badge>
        </XStack>

        {/* Prominent claim CTA, always blue (Button's default 'primary' variant), opens
            the Superfluid-operated claim app in a new tab — never embedded in the widget. */}
        <Button
          size="sm"
          {...compactButtonProps}
          onPress={() => window.open(SUPERFLUID_CLAIM_APP_URL, '_blank', 'noopener,noreferrer')}
        >
          <ButtonText>Claim SUP rewards</ButtonText>
        </Button>
      </XStack>
    </YStack>
  )
}
