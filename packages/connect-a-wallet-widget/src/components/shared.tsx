import React from 'react'
import { Button, type ButtonProps, Card, Icon, Text, XStack, YStack, createComponent } from '@goodwidget/ui'

export const WidgetContent = createComponent(YStack, {
  name: 'ConnectAWalletWidgetContent',
  flex: 1,
  gap: '$3',
  paddingVertical: '$3',
})

export const EmptyStateCard = createComponent(Card, {
  name: 'EmptyStateCard',
  padding: '$6',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: '$3',
})

export const ChainRowCard = createComponent(Card, {
  name: 'ChainRowCard',
  padding: '$3',
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  gap: '$2',
})

export const AddressFormCard = createComponent(Card, {
  name: 'AddressFormCard',
  padding: '$4',
  gap: '$3',
})

export function ActionButton({ children, minWidth = 108, size = 'sm', ...props }: ButtonProps) {
  return (
    <Button minWidth={minWidth} size={size} {...props}>
      {children}
    </Button>
  )
}

const MultiWalletNoticeFrame = createComponent(XStack, {
  name: 'MultiWalletNoticeFrame',
  alignItems: 'flex-start',
  gap: '$2',
  padding: '$3',
  borderRadius: '$2',
  borderWidth: 1,
  backgroundColor: '$infoMuted',
  borderColor: '$primary',
})

/**
 * Multi-wallet / shared daily-claim notice from the #113 design reference.
 * Built locally rather than reusing Alert because Alert only takes a plain
 * message string and this copy requires a bold second sentence.
 */
export function MultiWalletNotice() {
  return (
    <MultiWalletNoticeFrame>
      <Icon name="info" size="sm" color="primary" />
      <Text flex={1} tone="secondary" fontSize="$2" lineHeight="$2">
        You can connect multiple wallet addresses.{' '}
        <Text tone="secondary" bold fontSize="$2" lineHeight="$2">
          However, only one claim per day is available, shared between the connected accounts.
        </Text>
      </Text>
    </MultiWalletNoticeFrame>
  )
}

const SupportedNetworksFooterFrame = createComponent(XStack, {
  name: 'SupportedNetworksFooterFrame',
  justifyContent: 'center',
  paddingTop: '$2',
})

/** Static footer naming every chain the widget supports, per the design reference. */
export function SupportedNetworksFooter() {
  return (
    <SupportedNetworksFooterFrame>
      <Text tone="dim" fontSize="$1" lineHeight="$1">
        Supported Networks: Celo, XDC, Fuse
      </Text>
    </SupportedNetworksFooterFrame>
  )
}
