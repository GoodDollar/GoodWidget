import React from 'react'
import { styled, Stack, Text as TamaguiText } from 'tamagui'
import { createComponent } from '../createComponent'
import { createInputChangeHandlers } from './inputChangeHandlers'

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

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  label?: string
  errorMessage?: string
  error?: boolean
  size?: 'sm' | 'md' | 'lg'
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  onChangeText?: (text: string) => void
}

const InputWithLabel = React.forwardRef<unknown, InputProps>(function InputWithLabel(
  { label, errorMessage, error, onChangeText, onChange, ...props },
  ref,
) {
  const { onChange: handleChange, onChangeText: handleChangeText } = React.useMemo(
    () => createInputChangeHandlers({ onChange, onChangeText }),
    [onChange, onChangeText],
  )

  return (
    <Stack gap="$1">
      {label && <InputLabel>{label}</InputLabel>}
      <InputFrame
        ref={ref}
        error={error || !!errorMessage}
        onChange={handleChange}
        onChangeText={handleChangeText}
        {...props}
      />
      {errorMessage && <InputError>{errorMessage}</InputError>}
    </Stack>
  )
})

export const Input = InputWithLabel
export { InputFrame, InputLabel, InputError }
