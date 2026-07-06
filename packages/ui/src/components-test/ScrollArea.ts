import { YStack } from 'tamagui'
import { createComponent } from '../createComponent'

export const ScrollArea = createComponent(YStack, {
  name: 'ScrollArea',
  flex: 1,
  overflow: 'auto' as const,
  overflowX: 'hidden' as const,
})
