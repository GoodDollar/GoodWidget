/**
 * DataSourceToggle — Live/Demo two-button switch. Deliberately never
 * disables the "Live" button even when the live endpoint is known to be
 * unreachable: per the reference dashboard's updateToggleState(), clicking
 * "Live" while unavailable is itself the mechanism that reveals the inline
 * "endpoint not yet deployed" messaging, so disabling the button would hide
 * that path entirely.
 */
import React from 'react'
import { Button, ButtonText, XStack } from '@goodwidget/ui'
import type { AnalyticsDataSource } from '../hooks/useAnalyticsData'

export interface DataSourceToggleProps {
  source: AnalyticsDataSource
  onSelect: (source: AnalyticsDataSource) => void
}

export function DataSourceToggle({ source, onSelect }: DataSourceToggleProps) {
  return (
    <XStack gap="$2" data-testid="data-source-toggle">
      <Button
        size="sm"
        variant={source === 'live' ? 'primary' : 'secondary'}
        onPress={() => onSelect('live')}
        data-testid="toggle-live"
      >
        <ButtonText>Live</ButtonText>
      </Button>
      <Button
        size="sm"
        variant={source === 'demo' ? 'primary' : 'secondary'}
        onPress={() => onSelect('demo')}
        data-testid="toggle-demo"
      >
        <ButtonText>Demo</ButtonText>
      </Button>
    </XStack>
  )
}
