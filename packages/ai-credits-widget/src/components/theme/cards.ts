import { createComponent, Card, XStack } from '@goodwidget/ui'

/** Primary hero card containing G$ input and bonus badge */
export const AiCreditsHeroCard = createComponent(Card, {
  name: 'AiCreditsHeroCard',
  extends: 'Card',
  gap: '$4',
  backgroundColor: '$backgroundHover',
})

/** Panel for buyer key generation and confirmation */
export const BuyerKeyPanelCard = createComponent(Card, {
  name: 'BuyerKeyPanelCard',
  extends: 'Card',
  gap: '$3',
})

/** Operator consent step container */
export const OperatorConsentCard = createComponent(Card, {
  name: 'OperatorConsentCard',
  extends: 'Card',
  gap: '$3',
  backgroundColor: '$backgroundHover',
})

/** Amount picker container for deposit and stream inputs */
export const AmountPickerCard = createComponent(Card, {
  name: 'AmountPickerCard',
  extends: 'Card',
  gap: '$4',
})

/** Credits management dashboard card */
export const CreditsManagementCardFrame = createComponent(Card, {
  name: 'CreditsManagementCard',
  extends: 'Card',
  gap: '$4',
})

/** Buyer and operator management card */
export const BuyerOperatorCardFrame = createComponent(Card, {
  name: 'BuyerOperatorCard',
  extends: 'Card',
  gap: '$3',
})

/** Copyable setup snippet card */
export const SetupSnippetCard = createComponent(Card, {
  name: 'SetupSnippetCard',
  extends: 'Card',
  gap: '$3',
})

/** Usage log accordion container */
export const UsageLogCard = createComponent(Card, {
  name: 'UsageLogCard',
  extends: 'Card',
  gap: '$2',
})

/** Status notice banner wrapping Text + Card */
export const AiCreditsStatusNotice = createComponent(Card, {
  name: 'AiCreditsStatusNotice',
  extends: 'Card',
  borderWidth: 1,
  padding: '$3',
})

/** Bonus badge pill — highlights the active credit bonus percentage */
export const BonusBadgeFrame = createComponent(XStack, {
  name: 'BonusBadgeFrame',
  borderRadius: '$full',
  paddingHorizontal: '$3',
  paddingVertical: '$1',
  alignItems: 'center' as const,
  gap: '$1',
})

