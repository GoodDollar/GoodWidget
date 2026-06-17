import React from 'react'
import { createComponent } from '../createComponent'
import { ButtonFrame, ButtonText } from './Button'
import { Spinner } from '../components-test/Spinner'
import { XStack, YStack } from '../components-test/Stacks'

const ClaimActionButton = createComponent(ButtonFrame, {
  name: 'ClaimActionButton',
  extends: 'Button',
  width: 160,
  height: 160,
  borderRadius: 9999,
  backgroundColor: '$backgroundTransparent',
  borderWidth: 0,
  shadowOpacity: 0,
  overflow: 'visible' as const,
  position: 'relative' as const,
  paddingHorizontal: 0,
  hoverStyle: { backgroundColor: '$backgroundTransparent' },
  pressStyle: { backgroundColor: '$backgroundTransparent', opacity: 0.95 },
  focusStyle: { backgroundColor: '$backgroundTransparent', outlineStyle: 'none' },
})

const ClaimActionGlow = createComponent(YStack, {
  name: 'ClaimActionGlow',
  position: 'absolute' as const,
  top: '$glowOffset',
  right: '$glowOffset',
  bottom: '$glowOffset',
  left: '$glowOffset',
  borderRadius: 9999,
  backgroundColor: '$backgroundColor',
  hoverStyle: {
    backgroundColor: '$primaryLight',
  },
  opacity: '$glowOpacity',
})

const ClaimActionRing = createComponent(YStack, {
  name: 'ClaimActionRing',
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  borderRadius: 9999,
  backgroundColor: '$primary',
  hoverStyle: {
    backgroundColor: '$primaryLight',
  },
})

const ClaimActionInner = createComponent(YStack, {
  name: 'ClaimActionInner',
  position: 'absolute' as const,
  top: 2,
  right: 2,
  bottom: 2,
  left: 2,
  borderRadius: 9999,
  backgroundColor: '$backgroundDark',
  hoverStyle: {
    backgroundColor: '$backgroundDarkHover',
  },
})

export interface CircularActionButtonProps {
  label: string
  disabled?: boolean
  pending?: boolean
  onPress?: () => void
}

export function CircularActionButton({
  label,
  disabled = false,
  pending = false,
  onPress,
}: CircularActionButtonProps) {
  const labelColor = pending || disabled ? '$grey600' : '$primary'

  return (
    <ClaimActionButton onPress={disabled ? undefined : onPress} disabled={disabled}>
      <ClaimActionGlow style={{ filter: 'blur(20px)' } as React.CSSProperties} />
      <ClaimActionRing>
        <ClaimActionInner />
      </ClaimActionRing>
      <YStack
        position="absolute"
        top={0}
        right={0}
        bottom={0}
        left={0}
        alignItems="center"
        justifyContent="center"
        zIndex={1}
        pointerEvents="none"
        paddingHorizontal="$3"
      >
        {pending ? (
          <XStack gap="$2" alignItems="center">
            <ButtonText color={labelColor} textAlign="center">
              {label}
            </ButtonText>
            <Spinner size="sm" color="$grey600" />
          </XStack>
        ) : (
          <ButtonText color={labelColor} textAlign="center">
            {label}
          </ButtonText>
        )}
      </YStack>
    </ClaimActionButton>
  )
}
