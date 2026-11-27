import React from 'react'
import { Anchor as TamaguiAnchor } from 'tamagui'

interface AnchorProps {
  href: string
  children: React.ReactNode
  target?: '_blank' | '_self' | '_parent' | '_top'
  rel?: string
  /** Inline layout overrides — anchors are often used as flex children around a Button. */
  style?: React.CSSProperties
  /** Fires on press, before the link opens. Cannot prevent navigation on native, so validate `href` before rendering. */
  onPress?: () => void
}

/**
 * Renders Tamagui's Anchor directly, with the style props applied inline, instead of wrapping it in
 * `createComponent` (`styled()`). On native, `styled()` over Tamagui's Anchor swallows `onPress`, so the
 * link opened but the host never heard about the press. Tamagui's Anchor calls `onPress` and then
 * `Linking.openURL(href)` itself on native, and renders a plain `<a href>` on web.
 */
export function Anchor({ href, children, target = '_blank', rel, ...rest }: AnchorProps) {
  return (
    <TamaguiAnchor
      color="$primary"
      textDecorationLine="underline"
      fontFamily="$body"
      fontSize="$3"
      hoverStyle={{ opacity: 0.85 }}
      pressStyle={{ opacity: 0.7 }}
      href={href}
      target={target}
      rel={rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)}
      {...rest}
    >
      {children}
    </TamaguiAnchor>
  )
}
