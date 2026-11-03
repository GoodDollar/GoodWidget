import { GlowCard } from './GlowCard'
import { createComponent } from '../createComponent'

// Standalone surface for NextTaskModal's recommendation — a GlowCard laid out
// as a horizontal row (image left, text right) to match the design reference.
export const NextTaskCtaCard = createComponent(GlowCard, {
  name: 'NextTaskCtaCard',
  extends: 'GlowCard',
  width: '100%',
  flexDirection: 'row',
  padding: '$4',
  gap: '$4',
  alignItems: 'center',
})
