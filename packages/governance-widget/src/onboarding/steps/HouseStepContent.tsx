import { Card, Heading, Text, YStack } from '@goodwidget/ui'
import { HouseSelectionCard } from '../HouseSelectionCard'
import type { GovernanceHouse } from '../../types'

interface HouseStepContentProps {
  selectedHouse?: GovernanceHouse
  disabledHouseOptions: GovernanceHouse[]
  stakeAmountLabel: string
  onHouseSelect: (nextHouse: GovernanceHouse) => void
}

export function HouseStepContent({
  selectedHouse,
  disabledHouseOptions,
  stakeAmountLabel,
  onHouseSelect,
}: HouseStepContentProps) {
  return (
    <YStack gap="$3">
      <Card elevated>
        <YStack gap="$3" role="radiogroup" aria-label="Select your governance house">
          <YStack gap="$1">
            <Heading level={5}>Pick a governance house</Heading>
            <Text tone="secondary">
              Each house holds a different profile and stake amount. Tap a card to select it, then continue
              from the footer.
            </Text>
          </YStack>
          <YStack gap="$3">
            <HouseSelectionCard
              house="citizenship"
              isSelected={selectedHouse === 'citizenship'}
              isDisabled={disabledHouseOptions.includes('citizenship')}
              stakeAmountLabel={stakeAmountLabel}
              onPress={() => onHouseSelect('citizenship')}
            />
            <HouseSelectionCard
              house="alignment"
              isSelected={selectedHouse === 'alignment'}
              isDisabled={disabledHouseOptions.includes('alignment')}
              stakeAmountLabel={stakeAmountLabel}
              onPress={() => onHouseSelect('alignment')}
            />
          </YStack>
        </YStack>
      </Card>
    </YStack>
  )
}
