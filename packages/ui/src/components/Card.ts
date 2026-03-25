import { YStack } from 'tamagui'
import { createComponent } from '../createComponent'

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
    elevated: {
      true: {
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 16,
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
