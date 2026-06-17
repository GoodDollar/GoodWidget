import React from 'react'
import { Card, Text, YStack } from '@goodwidget/ui'
import { HouseSelectionCard } from '../HouseSelectionCard'
import type { GovernanceHouse } from '../../types'

interface HouseStepContentProps {
  selectedHouse?: GovernanceHouse
  disabledHouseOptions: GovernanceHouse[]
  onHouseSelect: (nextHouse: GovernanceHouse) => void
}

export function HouseStepContent({
  selectedHouse,
  disabledHouseOptions,
  onHouseSelect,
}: HouseStepContentProps) {
  return (
    <YStack gap="$3">
      <Card elevated>
        <YStack gap="$3" role="radiogroup" aria-label="Select your governance house">
          <Text tone="secondary">
            Select the governance house that should receive your onboarding profile and stake commitment.
          </Text>
          <YStack gap="$3">
            <HouseSelectionCard
              house="citizenship"
              isSelected={selectedHouse === 'citizenship'}
              isDisabled={disabledHouseOptions.includes('citizenship')}
              onPress={() => onHouseSelect('citizenship')}
            />
            <HouseSelectionCard
              house="alignment"
              isSelected={selectedHouse === 'alignment'}
              isDisabled={disabledHouseOptions.includes('alignment')}
              onPress={() => onHouseSelect('alignment')}
            />
          </YStack>
        </YStack>
      </Card>
    </YStack>
  )
}
