import React from 'react'
import { Coins, HandCoins, MoreHorizontal, Sparkles, Waves } from '@goodwidget/ui'

const icons = {
  Claim: HandCoins,
  Reserve: Coins,
  Streaming: Waves,
  'AI Credits': Sparkles,
  More: MoreHorizontal,
}

export function EcosystemIcon({ name, muted = false }: { name: keyof typeof icons; muted?: boolean }) {
  const Glyph = icons[name]
  return <Glyph size={24} color={muted ? '$placeholderColor' : '$color'} />
}
