import React from 'react'
import type { ReactNode } from 'react'
import { Sheet, Stack, useTheme } from 'tamagui'
import { createComponent } from '../createComponent'

// Sheet owns drawer behavior. We wrap its themed sub-parts so they remain
// targetable through GoodWidget's manifest and host override chain.
const DrawerOverlay = createComponent(Sheet.Overlay as any, {
  name: 'DrawerOverlay',
  backgroundColor: '$backgroundOverlay',
  zIndex: 0,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animation: ['medium', { opacity: 'exit' }] as any,
  enterStyle: { opacity: 0 },
  exitStyle: { opacity: 0 },
})

const DrawerFrame = createComponent(Sheet.Frame as any, {
  name: 'Drawer',
  extends: 'Card',
  backgroundColor: '$backgroundHover',
  width: '100%',
  maxWidth: '$maxContentWidth',
  alignSelf: 'center',
  borderTopLeftRadius: 32,
  borderTopRightRadius: 32,
  borderTopWidth: 1,
  borderLeftWidth: 1,
  borderRightWidth: 1,
  borderColor: '$borderColor',
  paddingHorizontal: '$6',
  paddingTop: '$4',
  paddingBottom: '$4',
  shadowColor: '$elevationShadowColor',
  shadowOpacity: 1,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: -2 },
  gap: '$4',
  overflow: 'hidden',
  position: 'relative',
  zIndex: 1,
  animation: 'medium',
})

const DrawerHandle = createComponent(Sheet.Handle as any, {
  name: 'DrawerHandle',
  backgroundColor: '$borderColor',
  width: 48,
  height: 4,
  alignSelf: 'center',
  borderRadius: 9999,
  opacity: 1,
  marginBottom: '$2',
})

interface DrawerProps {
  open: boolean
  onClose: () => void
  children?: ReactNode
  height?: 'half' | 'full'
}

export function Drawer({ open, onClose, children, height = 'half' }: DrawerProps) {
  const theme = useTheme()
  const snapPoints = height === 'half' ? [50] : [80]

  return (
    <Sheet
      open={open}
      defaultPosition={0}
      onOpenChange={(openLocal: boolean) => {
        if (!openLocal) {
          onClose()
        }
      }}
      modal
      dismissOnOverlayPress
      dismissOnSnapToBottom
      snapPoints={snapPoints}
      snapPointsMode="percent"
      zIndex={Number(theme.zIndex?.val ?? 200)}
    >
      <DrawerOverlay style={{ backdropFilter: 'blur(2px)' }} />
      <DrawerFrame>
        <DrawerHandle />
        <Stack flex={1} width="100%" minHeight={0}>
          {children}
        </Stack>
      </DrawerFrame>
    </Sheet>
  )
}
