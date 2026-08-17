import React from 'react'
import { YStack } from 'tamagui'
import { createComponent } from '../createComponent'

const SCROLL_HIDE_CLASS = 'gw-scroll-area-hide'

let scrollbarStyleInjected = false

function ensureScrollbarHidden() {
  if (scrollbarStyleInjected || typeof document === 'undefined') return
  scrollbarStyleInjected = true
  const style = document.createElement('style')
  style.id = 'gw-scroll-area-hide'
  style.textContent = `.${SCROLL_HIDE_CLASS}::-webkit-scrollbar { display: none; width: 0; height: 0; }`
  document.head.appendChild(style)
}

const ScrollAreaFrame = createComponent(YStack, {
  name: 'ScrollArea',
  flex: 1,
  overflow: 'auto' as const,
  overflowX: 'hidden' as const,
})

type ScrollAreaProps = React.ComponentProps<typeof ScrollAreaFrame>

export function ScrollArea({ className, style, ...props }: ScrollAreaProps) {
  ensureScrollbarHidden()

  return (
    <ScrollAreaFrame
      {...props}
      className={[SCROLL_HIDE_CLASS, className].filter(Boolean).join(' ')}
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        ...(style as object | undefined),
      }}
    />
  )
}
