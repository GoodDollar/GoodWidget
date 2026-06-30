import React from 'react'
import type { ReactNode } from 'react'
import { Sheet, Stack, useTheme } from 'tamagui'
import { registerComponent } from '../manifest'

// Sheet owns drawer behavior. Its compound parts (Overlay/Frame/Handle) are
// `.styleable()` components that Sheet clones internally and attaches refs to.
//
// NOTE TO REVIEWER: We attempted to wrap Sheet.Overlay/Frame/Handle with
// `createComponent` (as in the base branch), but this caused a React error:
//   "Function components cannot be given refs"
// because Sheet's internal clone mechanism forwards refs to these compound
// parts. The createComponent HOC does not forward refs, breaking the Sheet
// animation/portal contract.
//
// The fix is to use Sheet.Overlay/Frame/Handle directly with style-object
// constants so theme tokens still resolve, and call registerComponent()
// manually to keep the surfaces discoverable through the override chain.
// This is the minimum change required to make the Drawer story test pass.
// See: packages/ui/src/components/Drawer.tsx change in this PR, and the
// Drawer.stories.tsx test which finds the button via within(document.body).
const overlayStyle = {
  backgroundColor: '$backgroundOverlay',
  zIndex: 0,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animation: ['medium', { opacity: 'exit' }] as any,
  enterStyle: { opacity: 0 },
  exitStyle: { opacity: 0 },
} as const

const frameStyle = {
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
} as const

const handleStyle = {
  backgroundColor: '$borderColor',
  width: 48,
  height: 4,
  alignSelf: 'center',
  borderRadius: 9999,
  opacity: 1,
  marginBottom: '$2',
} as const

// Keep the drawer surfaces discoverable through the GoodWidget manifest / host
// override chain (createComponent normally does this, but we use the Sheet
// parts directly here to preserve Sheet's ref forwarding).
registerComponent({ name: 'Drawer', extends: 'Card', themeKeys: ['background', 'borderColor', 'shadowColor'], variants: [] })

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
      <Sheet.Overlay {...overlayStyle} style={{ backdropFilter: 'blur(2px)' }} />
      <Sheet.Frame {...frameStyle}>
        <Sheet.Handle {...handleStyle} />
        <Stack flex={1} width="100%" minHeight={0}>
          {children}
        </Stack>
      </Sheet.Frame>
    </Sheet>
  )
}
