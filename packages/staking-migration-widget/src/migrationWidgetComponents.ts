import { createComponent, Card } from '@goodwidget/ui'

export const MigrationPrimaryCard = createComponent(Card, {
  name: 'ClaimCard',
  extends: 'Card',
  borderRadius: '$4',
  padding: '$4',
})

export const MigrationSecondaryCard = createComponent(Card, {
  name: 'StreakCard',
  extends: 'Card',
  borderRadius: '$3',
  padding: '$3',
})
