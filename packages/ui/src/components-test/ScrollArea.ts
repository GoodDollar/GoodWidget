import { YStack } from 'tamagui'
import { createComponent } from '../createComponent'

export const ScrollArea = createComponent(YStack, {
  name: 'ScrollArea',
  flex: 1,
  overflow: 'scroll' as const,
})
