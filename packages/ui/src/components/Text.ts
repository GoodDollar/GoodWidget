import { Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'

export const Text = createComponent(TamaguiText, {
  name: 'GWText',
  fontFamily: '$body',
  color: '$color',
  fontSize: '$3',
  lineHeight: '$3',

  variants: {
    variant: {
      body: { fontSize: '$3', lineHeight: '$3' },
      caption: { fontSize: '$1', lineHeight: '$1', color: '$placeholderColor' },
      label: { fontSize: '$2', lineHeight: '$2', fontWeight: '500' },
      large: { fontSize: '$5', lineHeight: '$5' },
    },
    secondary: {
      true: { color: '$placeholderColor' },
    },
    bold: {
      true: { fontWeight: '700' },
    },
    center: {
      true: { textAlign: 'center' },
    },
  } as const,
})
