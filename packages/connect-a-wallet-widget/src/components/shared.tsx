import React from 'react'
import { Button, type ButtonProps, Card, YStack, createComponent } from '@goodwidget/ui'

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
