import { styled, Stack, Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'

export const Badge = createComponent(Stack, {
  name: 'Badge',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$6',
  backgroundColor: '$background',
  gap: '$1',

  variants: {
    type: {
      default: {},
      success: { backgroundColor: '#E8F5E9' },
      error: { backgroundColor: '#FFEBEE' },
      warning: { backgroundColor: '#FFF8E1' },
      info: { backgroundColor: '#E3F2FD' },
    },
  } as const,

  defaultVariants: {
    type: 'default',
  },
})

export const BadgeText = styled(TamaguiText, {
  name: 'BadgeText',
  fontFamily: '$body',
  fontSize: '$1',
  fontWeight: '600',
  color: '$color',
})
