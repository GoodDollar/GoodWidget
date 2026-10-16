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

export const AddressFormCard = createComponent(Card, {
  name: 'AddressFormCard',
  padding: '$4',
  gap: '$3',
})

export function ActionButton({ children, size = 'sm', ...props }: ButtonProps) {
  return (
    <Button size={size} {...props}>
      {children}
    </Button>
  )
}
