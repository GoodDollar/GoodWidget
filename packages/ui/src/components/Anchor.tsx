import React from 'react'
import { Anchor as TamaguiAnchor } from 'tamagui'
import { createComponent } from '../createComponent'

const AnchorFrame = createComponent(TamaguiAnchor, {
  name: 'Anchor',
  color: '$colorLink',
  textDecorationLine: 'underline',
  fontFamily: '$body',
  fontSize: '$3',
  // Hover and press keep the text fully opaque so the link color keeps its 4.5:1 contrast.
  hoverStyle: {
    textDecorationLine: 'none',
  },
  pressStyle: {
    textDecorationLine: 'none',
  },
})

interface AnchorProps {
  href: string
  children: React.ReactNode
  target?: '_blank' | '_self' | '_parent' | '_top'
  rel?: string
  /** Inline layout overrides — anchors are often used as flex children around a Button. */
  style?: React.CSSProperties
}

export function Anchor({ href, children, target = '_blank', rel, ...rest }: AnchorProps) {
  return (
    <AnchorFrame
      href={href}
      target={target}
      rel={rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)}
      {...rest}
    >
      {children}
    </AnchorFrame>
  )
}
