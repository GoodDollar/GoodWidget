import { Stack } from 'tamagui'
import { Badge, BadgeText, Heading, Icon, PillText, Text, XStack, YStack, createComponent } from '@goodwidget/ui'
import { HOUSE_COPY } from './copy'
import type { GovernanceHouse } from '../types'

/**
 * Internal house-selection button. Uses createComponent to register for theme overrides.
 */
const HouseOptionButton = createComponent(Stack, {
  name: 'GovernanceHouseOptionButton',
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

const RadioBullet = createComponent(Stack, {
  name: 'GovernanceRadioBullet',
  width: 24,
  height: 24,
  borderRadius: '$full',
  borderWidth: 2,
  borderColor: '$borderColor',
  backgroundColor: '$background',
  alignItems: 'center',
  justifyContent: 'center',
  variants: {
    selected: {
      true: {
        borderColor: '$primary',
      },
    },
  } as const,
})

const RadioDot = createComponent(Stack, {
  name: 'GovernanceRadioDot',
  width: 10,
  height: 10,
  borderRadius: '$full',
  backgroundColor: '$primary',
  variants: {
    selected: {
      false: {
        backgroundColor: 'transparent',
      },
    },
  } as const,
})

const HousePill = createComponent(Stack, {
  name: 'GovernanceHousePill',
  borderRadius: '$full',
  borderWidth: 1,
  borderColor: '$borderColor',
  backgroundColor: '$surface',
  paddingHorizontal: '$3',
  paddingVertical: '$1',
  alignItems: 'center',
  justifyContent: 'center',
})

interface HouseSelectionCardProps {
  house: GovernanceHouse
  isSelected: boolean
  isDisabled: boolean
  stakeAmountLabel: string
  onPress: () => void
}

export function HouseSelectionCard({
  house,
  isSelected,
  isDisabled,
  stakeAmountLabel,
  onPress,
}: HouseSelectionCardProps) {
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
      <XStack alignItems="center" gap="$3" width="100%">
        <RadioBullet selected={isSelected}>
          <RadioDot selected={isSelected} />
        </RadioBullet>
        <YStack flex={1} gap="$1">
          <Heading level={5}>{houseCopy.title}</Heading>
          <Text tone="secondary">{houseCopy.summary}</Text>
        </YStack>
      </XStack>

      <XStack gap="$2" flexWrap="wrap" alignItems="center">
        <HousePill>
          <PillText>{houseCopy.label}</PillText>
        </HousePill>
        <HousePill>
          <PillText>{`${stakeAmountLabel} stake`}</PillText>
        </HousePill>
        {isSelected ? (
          <Badge type="success">
            <BadgeText>Selected</BadgeText>
          </Badge>
        ) : null}
      </XStack>

      <XStack alignItems="center" gap="$2" alignSelf="flex-end">
        <Text color="$primary" fontWeight="700">
          Continue with this house
        </Text>
        <Icon name="arrow-right" size="sm" color="primary" />
      </XStack>
    </HouseOptionButton>
  )
}
