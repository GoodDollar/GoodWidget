import { YStack } from 'tamagui'
import { createComponent } from '../createComponent'

export const Container = createComponent(YStack, {
  name: 'Container',
  width: '100%',
  maxWidth: 480,
  marginHorizontal: 'auto',
  padding: '$4',
  flex: 1,
})
