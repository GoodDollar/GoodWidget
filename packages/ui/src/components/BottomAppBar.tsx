import React from 'react'
import type { ReactNode } from 'react'
import { XStack, YStack } from 'tamagui'

export interface BottomAppBarProps {
  children: ReactNode
  'data-testid'?: string
}

/** Navigation surface; the host controls its placement within the widget shell. */
export function BottomAppBar({ children, 'data-testid': testId }: BottomAppBarProps) {
  return (
    <YStack width="100%" backgroundColor="$backgroundHover" data-testid={testId}>
      <YStack height={1} backgroundColor="$borderColor" />
      <XStack width="100%" height={58} role="navigation">
        {children}
      </XStack>
    </YStack>
  )
}
