import { createComponent, Card } from '@goodwidget/ui'

/** Outer shell card wrapping the Superfluid campaign widget views. */
export const CampaignShellCard = createComponent(Card, {
  name: 'CampaignShell',
  extends: 'Card',
  padding: 0,
  backgroundColor: '$backgroundDark',
  width: '100%',
})

/** Card surface for an individual campaign action row/tile. */
export const ActionCardFrame = createComponent(Card, {
  name: 'ActionCard',
  extends: 'Card',
  flexDirection: 'column',
  gap: '$3',
})

/** Summary card shown on the campaign content page. */
export const LeaderboardSummaryCard = createComponent(Card, {
  name: 'LeaderboardSummary',
  extends: 'Card',
  gap: '$4',
})

/** Single ranked row card inside LeaderboardView. */
export const LeaderboardRowCard = createComponent(Card, {
  name: 'LeaderboardRow',
  extends: 'Card',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$3',
  padding: '$3',
})
