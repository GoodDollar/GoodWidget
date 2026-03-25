import React from 'react'
import type { ReactNode } from 'react'
import { Stack, Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'

const Overlay = createComponent(Stack, {
  name: 'ActionSheetOverlay',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'flex-end',
  zIndex: 1000,
})

const SheetFrame = createComponent(Stack, {
  name: 'ActionSheet',
  backgroundColor: '$background',
  borderTopLeftRadius: '$4',
  borderTopRightRadius: '$4',
  padding: '$4',
  paddingBottom: '$6',
  gap: '$3',
  maxHeight: '80%',
})

const SheetHandle = createComponent(Stack, {
  name: 'ActionSheetHandle',
  width: 36,
  height: 4,
  borderRadius: 2,
  backgroundColor: '$borderColor',
  alignSelf: 'center',
  marginBottom: '$2',
})

interface ActionSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function ActionSheet({ open, onClose, title, children }: ActionSheetProps) {
  if (!open) return null

  return (
    <Overlay onPress={onClose}>
      <SheetFrame onPress={(e: { stopPropagation: () => void }) => e.stopPropagation()}>
        <SheetHandle />
        {title && (
          <TamaguiText
            fontFamily="$heading"
            fontSize="$5"
            fontWeight="600"
            color="$color"
            textAlign="center"
          >
            {title}
          </TamaguiText>
        )}
        {children}
      </SheetFrame>
    </Overlay>
  )
}
