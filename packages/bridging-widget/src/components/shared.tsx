import React from 'react'
import {
  Button,
  type ButtonProps,
  Card,
  Text,
  XStack,
  YStack,
  createComponent,
} from '@goodwidget/ui'
import type { BridgeProtocol } from '@goodsdks/bridging-sdk'

// Shared across BridgeTab (protocol picker) and FeeBreakdown (route summary)
// so the two screens never label the same protocol differently.
export const PROTOCOL_LABELS: Record<BridgeProtocol, string> = {
  AXELAR: 'Axelar (Celo, Ethereum)',
  LAYERZERO: 'LayerZero (Celo, Ethereum, Fuse, XDC)',
}

export const BridgingTabContent = createComponent(YStack, {
  name: 'BridgingTabContent',
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

export const RouteSelectionCard = createComponent(Card, {
  name: 'RouteSelectionCard',
  padding: '$4',
  gap: '$3',
})

// A single right-aligned key/value row, shared by FeeBreakdown and ReviewScreen
// so the main-screen and Confirm-screen fee breakdowns always read identically.
export function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <XStack justifyContent="space-between" alignItems="center">
      <Text fontSize={12} fontWeight="600" color="$secondaryColor">
        {label}
      </Text>
      <Text fontSize={14} fontWeight="500" color={valueColor ?? '$textColor'}>
        {value}
      </Text>
    </XStack>
  )
}

export function ActionButton({
  children,
  minWidth = 100,
  size = 'sm',
  ...props
}: ButtonProps) {
  return (
    <Button minWidth={minWidth} size={size} {...props}>
      {children}
    </Button>
  )
}
