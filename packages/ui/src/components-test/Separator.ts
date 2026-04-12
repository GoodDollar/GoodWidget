import { YStack } from 'tamagui'
import { createComponent } from '../createComponent'

export const Separator = createComponent(YStack, {
  name: 'Separator',
  height: 1,
  width: '100%',
  backgroundColor: '$borderColor',

  variants: {
    vertical: {
      true: {
        height: '100%',
        width: 1,
      },
    },
  } as const,
})
