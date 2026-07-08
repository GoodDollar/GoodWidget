import { createComponent, Card, XStack } from '@goodwidget/ui'

export const AiCreditsStatusNotice = createComponent(Card, {
  name: 'AiCreditsStatusNotice',
  extends: 'Card',
  borderWidth: 1,
  padding: '$3',
})

export const BonusBadgeFrame = createComponent(XStack, {
  name: 'BonusBadgeFrame',
  borderRadius: '$full',
  paddingHorizontal: '$2',
  paddingVertical: 2,
  alignItems: 'center' as const,
  alignSelf: 'flex-start' as const,
  gap: '$1',
})
