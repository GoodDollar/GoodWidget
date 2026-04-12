import React from 'react'
import type { ReactNode } from 'react'
import { Stack, Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'

const ShellFrame = createComponent(Stack, {
  name: 'MiniAppShell',
  flex: 1,
  backgroundColor: '$background',
  width: '100%',
  maxWidth: 480,
  marginHorizontal: 'auto',
})

const ShellHeader = createComponent(Stack, {
  name: 'MiniAppShellHeader',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: '$4',
  paddingVertical: '$3',
  borderBottomWidth: 1,
  borderBottomColor: '$borderColor',
})

const ShellBody = createComponent(Stack, {
  name: 'MiniAppShellBody',
  flex: 1,
  padding: '$4',
  gap: '$4',
  overflow: 'scroll' as const,
})

interface MiniAppShellProps {
  title?: string
  headerRight?: ReactNode
  children: ReactNode
}

export function MiniAppShell({ title, headerRight, children }: MiniAppShellProps) {
  return (
    <ShellFrame>
      {title && (
        <ShellHeader>
          <TamaguiText fontFamily="$heading" fontSize="$5" fontWeight="600" color="$color">
            {title}
          </TamaguiText>
          {headerRight && <Stack>{headerRight}</Stack>}
        </ShellHeader>
      )}
      <ShellBody>{children}</ShellBody>
    </ShellFrame>
  )
}
