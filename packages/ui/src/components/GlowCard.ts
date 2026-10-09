import { Card } from './Card'
import { createComponent } from '../createComponent'

// Explicit glow surface primitive for places that should visually pop
// (for example primary claim/action surfaces) under a preset.
export const GlowCard = createComponent(Card, {
  name: 'GlowCard',
  extends: 'Card',
  borderColor: '$borderColorFocus',
  shadowColor: '$borderColorFocus',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 1,
  shadowRadius: 34,
})
