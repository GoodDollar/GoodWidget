import { Card } from './Card'
import { createComponent } from '../createComponent'

// Standalone surface for NextTaskModal's recommendation — an elevated Card laid out
// as a horizontal row (image left, text right) with clear visual hierarchy and no harsh glow.
export const NextTaskCtaCard = createComponent(Card, {
  name: 'NextTaskCtaCard',
  extends: 'Card',
  width: '100%',
  flexDirection: 'row',
  padding: '$4',
  gap: '$3',
  alignItems: 'flex-start',
  backgroundColor: '$background',
  borderColor: '$borderColor',
  borderWidth: 1,
  borderRadius: '$4',
  shadowOpacity: 0,
})
