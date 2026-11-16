import React from 'react'
import { YStack } from 'tamagui'
import { Button, ButtonText } from './Button'
import { Card } from './Card'
import { Text } from './Text'

export interface WidgetUnavailableProps {
  widgetName: string
  networkName: string
  onSwitchNetwork?: () => void
  switching?: boolean
  title?: string
  switchLabel?: string
  'data-testid'?: string
}

export function WidgetUnavailable({
  widgetName, networkName, onSwitchNetwork, switching = false,
  title = 'Not available on this network', switchLabel = 'Switch network',
  'data-testid': testId,
}: WidgetUnavailableProps) {
  return (
    <YStack gap="$4" width="100%" data-testid={testId}>
      <Card outlined>
        <Text bold>{title}</Text>
        <Text secondary>{widgetName} is not supported on {networkName}. Switch to a supported network to continue.</Text>
      </Card>
      <Button size="lg" fullWidth disabled={switching || !onSwitchNetwork} onPress={onSwitchNetwork} aria-busy={switching}>
        <ButtonText>{switchLabel}</ButtonText>
      </Button>
    </YStack>
  )
}
