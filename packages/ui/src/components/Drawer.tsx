import React from 'react'
import type { ReactNode } from 'react'
import { Sheet, Stack, useTheme } from 'tamagui'
import { registerComponent } from '../manifest'

// Sheet owns drawer behavior. Its compound parts (Overlay/Frame/Handle) are
// special `extractable`/`styleable` components that Sheet clones internally and
// attaches refs to. Re-wrapping them with styled()/createComponent breaks that
// ref forwarding (React: "Function components cannot be given refs ... DrawerOverlay")
// and the sheet fails to mount. We therefore use the Sheet parts directly and
// apply GoodWidget theme tokens through inline style props, which still resolve
// against the active theme. The shared style objects below keep the visual
// contract in one place.
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
// override chain even though the parts are styled inline rather than via
// createComponent.
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
