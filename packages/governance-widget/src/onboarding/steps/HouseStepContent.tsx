import { Card, YStack } from '@goodwidget/ui'
import { HouseSelectionCard } from '../HouseSelectionCard'
import type { GovernanceHouse } from '../../types'

interface HouseStepContentProps {
  selectedHouse?: GovernanceHouse
  disabledHouseOptions: GovernanceHouse[]
  stakeAmountLabels: Record<GovernanceHouse, string>
  onHouseSelect: (nextHouse: GovernanceHouse) => void
}

export function HouseStepContent({
  selectedHouse,
  disabledHouseOptions,
  stakeAmountLabels,
  onHouseSelect,
}: HouseStepContentProps) {
  return (
    <YStack gap="$3">
      <Card elevated>
        <YStack gap="$3" role="radiogroup" aria-label="Select your governance house">
          <HouseSelectionCard
            house="alignment"
            isSelected={selectedHouse === 'alignment'}
            isDisabled={disabledHouseOptions.includes('alignment')}
            stakeAmountLabel={stakeAmountLabels.alignment}
            onPress={() => onHouseSelect('alignment')}
          />
          <HouseSelectionCard
            house="citizenship"
            isSelected={selectedHouse === 'citizenship'}
            isDisabled={disabledHouseOptions.includes('citizenship')}
            stakeAmountLabel={stakeAmountLabels.citizenship}
            onPress={() => onHouseSelect('citizenship')}
          />
        </YStack>
      </Card>
    </YStack>
  )
}
