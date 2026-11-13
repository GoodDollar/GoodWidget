import React from 'react'
import type { ReactNode } from 'react'
import { ScrollView, Text, YStack } from 'tamagui'
import { Drawer } from './Drawer'

export interface WidgetDrawerProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  height?: 'half' | 'full'
}

/** Controlled bottom sheet; its children are normally WidgetListRow elements. */
export function WidgetDrawer({
  open, onClose, children, title = 'All widgets', height = 'full',
}: WidgetDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} height={height}>
      <YStack flex={1} minHeight={0} gap="$2">
        <Text fontFamily="$body" fontSize="$3" color="$color" minHeight={40} paddingRight="$6">
          {title}
        </Text>
        <ScrollView flex={1} showsVerticalScrollIndicator>
          {children}
        </ScrollView>
      </YStack>
    </Drawer>
  )
}
