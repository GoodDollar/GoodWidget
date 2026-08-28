import { YStack } from 'tamagui'
import { createComponent } from '../createComponent'

/**
 * Default: A container to be treated as surface, the first layer above background.
 * Raised: A card with a slightly elevated background to indicate prominence, surface-raised. highest level container/card.
 * Elevated: A card with a more pronounced shadow that is lifting up the card from the background visually.
 */
export const Card = createComponent(YStack, {
  name: 'Card',
  backgroundColor: '$background',
  borderRadius: '$3',
  padding: '$4',
  borderWidth: 1,
  borderColor: '$borderColor',
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 8,
  gap: '$3',

  variants: {
    raised: {
      true: {
        shadowOpacity: 0,
        borderRadius: '$2',
        backgroundColor: '$backgroundRaised',
      },
    },
    elevated: {
      true: {
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 16,
        borderRadius: '$2',
        backgroundColor: '$backgroundRaised',
      },
    },
    outlined: {
      true: {
        shadowOpacity: 0,
        borderWidth: 1,
        borderColor: '$borderColor',
      },
    },
  } as const,
})
