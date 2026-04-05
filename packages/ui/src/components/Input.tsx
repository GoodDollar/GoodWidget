import React from 'react'
import { styled, Stack, Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'

const InputFrame = createComponent(Stack, {
  name: 'Input',
  tag: 'input',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '$background',
  borderRadius: '$2',
  borderWidth: 1,
  borderColor: '$borderColor',
  paddingHorizontal: '$3',
  height: '$10',
  color: '$color',
  fontFamily: '$body',
  fontSize: '$3',
  outlineWidth: 0,

  hoverStyle: {
    borderColor: '$borderColorHover',
  },
  focusStyle: {
    borderColor: '$borderColorFocus',
    shadowColor: '$shadowColorFocus',
    shadowRadius: 4,
    shadowOpacity: 1,
  },

  variants: {
    size: {
      sm: { height: '$8', paddingHorizontal: '$2', fontSize: '$2' },
      md: { height: '$10', paddingHorizontal: '$3', fontSize: '$3' },
      lg: { height: '$11', paddingHorizontal: '$4', fontSize: '$4' },
    },
    error: {
      true: {
        borderColor: '$error',
      },
    },
    disabled: {
      true: { opacity: 0.5, cursor: 'not-allowed' },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
})

const InputLabel = styled(TamaguiText, {
  name: 'InputLabel',
  fontFamily: '$body',
  fontSize: '$2',
  fontWeight: '500',
  color: '$color',
  marginBottom: '$1',
})

const InputError = styled(TamaguiText, {
  name: 'InputError',
  fontFamily: '$body',
  fontSize: '$1',
  color: '$error',
  marginTop: '$1',
})

export interface InputProps {
  label?: string
  errorMessage?: string
  error?: boolean
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  placeholder?: string
  value?: string
  onChangeText?: (text: string) => void
  [key: string]: unknown
}

const InputWithLabel = React.forwardRef<unknown, InputProps>(function InputWithLabel(
  { label, errorMessage, error, ...props },
  ref,
) {
  return (
    <Stack gap="$1">
      {label && <InputLabel>{label}</InputLabel>}
      <InputFrame ref={ref} error={error || !!errorMessage} {...props} />
      {errorMessage && <InputError>{errorMessage}</InputError>}
    </Stack>
  )
})

export const Input = InputWithLabel
export { InputFrame, InputLabel, InputError }
