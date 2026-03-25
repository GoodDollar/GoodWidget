import { Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'

export const Heading = createComponent(TamaguiText, {
  name: 'Heading',
  fontFamily: '$heading',
  fontWeight: '700',
  color: '$color',

  variants: {
    level: {
      1: { fontSize: '$10', lineHeight: '$10', letterSpacing: '$10' },
      2: { fontSize: '$9', lineHeight: '$9', letterSpacing: '$9' },
      3: { fontSize: '$7', lineHeight: '$7', letterSpacing: '$7' },
      4: { fontSize: '$6', lineHeight: '$6', letterSpacing: '$6' },
      5: { fontSize: '$5', lineHeight: '$5', letterSpacing: '$5' },
      6: { fontSize: '$4', lineHeight: '$4', letterSpacing: '$4' },
    },
  } as const,

  defaultVariants: {
    level: 3,
  },
})
