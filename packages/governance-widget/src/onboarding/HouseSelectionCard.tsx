import React from 'react'
import { Stack, styled } from 'tamagui'
import { Badge, BadgeText, Heading, Icon, Text, XStack, YStack } from '@goodwidget/ui'
import { HOUSE_COPY } from './copy'
import type { GovernanceHouse } from '../types'

/**
 * Internal house-selection button. Uses Tamagui's `styled()` directly (not
 * `createComponent`) because this is governance-specific UI, not a reusable
 * design-system primitive. Registering a `name` here would pollute the public
 * `@goodwidget/ui` manifest namespace with widget-internal components.
 */
const HouseOptionButton = styled(Stack, {
  tag: 'button',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  width: '100%',
  borderRadius: '$4',
  borderWidth: 1,
  borderColor: '$borderColor',
  backgroundColor: '$background',
  padding: '$4',
  gap: '$3',
  cursor: 'pointer',
  hoverStyle: {
    borderColor: '$borderColorFocus',
    backgroundColor: '$backgroundHover',
  },
  pressStyle: {
    borderColor: '$borderColorFocus',
    backgroundColor: '$backgroundPress',
  },
  variants: {
    selected: {
      true: {
        borderColor: '$borderColorFocus',
        backgroundColor: '$backgroundHover',
      },
    },
    disabled: {
      true: {
        opacity: 0.5,
        cursor: 'not-allowed',
        pointerEvents: 'none',
      },
    },
  } as const,
})

interface HouseSelectionCardProps {
  house: GovernanceHouse
  isSelected: boolean
  isDisabled: boolean
  onPress: () => void
}

export function HouseSelectionCard({ house, isSelected, isDisabled, onPress }: HouseSelectionCardProps) {
  const houseCopy = HOUSE_COPY[house]

  return (
    <HouseOptionButton
      selected={isSelected}
      disabled={isDisabled}
      role="radio"
      aria-checked={isSelected}
      onPress={onPress}
      data-testid={`GovernanceOnboardingWidget-house-${house}`}
    >
      <XStack alignItems="center" justifyContent="space-between" width="100%">
        <Badge type={isSelected ? 'success' : 'info'}>
          <BadgeText>{isSelected ? 'Selected' : 'Choose house'}</BadgeText>
        </Badge>
        <Icon name={isSelected ? 'check' : 'chevron-right'} color={isSelected ? 'success' : 'muted'} />
      </XStack>
      <YStack gap="$1">
        <Heading level={5}>{houseCopy.title}</Heading>
        <Text>{houseCopy.summary}</Text>
      </YStack>
      <Text tone="secondary">{houseCopy.helper}</Text>
    </HouseOptionButton>
  )
}
