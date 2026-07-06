import React, { useState } from 'react'
import { Icon, Text, XStack, YStack } from '@goodwidget/ui'

export function InfoTooltip({ message }: { message: string }) {
  const [open, setOpen] = useState(false)

  return (
    <XStack
      position="relative"
      alignItems="center"
      cursor="help"
      tabIndex={0}
      accessibilityLabel={message}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <Icon name="info" size="xs" color="primary" />
      {open && <TooltipBubble message={message} />}
    </XStack>
  )
}

function TooltipBubble({ message }: { message: string }) {
  return (
    <YStack
      position="absolute"
      bottom="100%"
      right={0}
      marginBottom="$1"
      backgroundColor="$background"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius="$2"
      padding="$2"
      maxWidth={280}
      zIndex={100}
      pointerEvents="none"
    >
      <Text fontSize="$1" lineHeight="$2" color="$color">
        {message}
      </Text>
    </YStack>
  )
}

export function HoverTooltip({
  message,
  children,
  fullWidth = false,
}: {
  message: string | null
  children: React.ReactNode
  fullWidth?: boolean
}) {
  const [open, setOpen] = useState(false)
  if (!message) return <>{children}</>

  return (
    <XStack
      position="relative"
      flexShrink={0}
      width={fullWidth ? '100%' : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && <TooltipBubble message={message} />}
    </XStack>
  )
}

