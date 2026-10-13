import { GlowCard } from './GlowCard'
import { createComponent } from '../createComponent'

// Standalone surface for NextTaskModal's content — a GlowCard tuned for a
// single centered CTA rather than GlowCard's general free-form layout.
export const NextTaskCtaCard = createComponent(GlowCard, {
  name: 'NextTaskCtaCard',
  extends: 'GlowCard',
  width: '100%',
  padding: '$5',
  gap: '$3',
  alignItems: 'center',
})
