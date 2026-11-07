import React from 'react'
import { Anchor as TamaguiAnchor } from 'tamagui'
import { registerComponent } from '../manifest'

registerComponent({
  name: 'Anchor',
  themeKeys: ['color', 'colorHover', 'colorPress'],
  variants: [],
})

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
 * Renders Tamagui's Anchor directly with named theme registration, preserving both
 * manifest-driven CSS overrides (`--gw-Anchor-*`) and native `onPress` event forwarding.
 */
export function Anchor({ href, children, target = '_blank', rel, ...rest }: AnchorProps) {
  return (
    <TamaguiAnchor
      theme="Anchor"
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
