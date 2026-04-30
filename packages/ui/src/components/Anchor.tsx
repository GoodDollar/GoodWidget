import React from 'react'
import { Anchor as TamaguiAnchor } from 'tamagui'
import { createComponent } from '../createComponent'

const AnchorFrame = createComponent(TamaguiAnchor, {
  name: 'Anchor',
  color: '$primary',
  textDecorationLine: 'underline',
  fontFamily: '$body',
  fontSize: '$3',
  hoverStyle: {
    opacity: 0.85,
  },
  pressStyle: {
    opacity: 0.7,
  },
})

interface AnchorProps {
  href: string
  children: React.ReactNode
  target?: '_blank' | '_self' | '_parent' | '_top'
  rel?: string
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
