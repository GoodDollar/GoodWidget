import React from 'react'
import type { GoodWidgetThemeOverrides, GoodWidgetConfig } from '@goodwidget/core'
import { GoodWidgetProvider } from '@goodwidget/core'
import { Card, Text, YStack } from '@goodwidget/ui'

function PlaceholderInner() {
  return (
    <Card>
      <YStack gap="$3" padding="$4">
        <Text variant="title">Placeholder Widget</Text>
        <Text secondary>Scaffold only — replace with real widget content.</Text>
      </YStack>
    </Card>
  )
}

export interface PlaceholderWidgetProps {
  config?: GoodWidgetConfig
  themeOverrides?: GoodWidgetThemeOverrides
  defaultTheme?: 'light' | 'dark'
}

/**
 * Placeholder widget — a minimal scaffold showing the standard
 * GoodWidgetProvider + @goodwidget/ui composition new widgets start from.
 */
export function PlaceholderWidget({
  config,
  themeOverrides,
  defaultTheme = 'dark',
}: PlaceholderWidgetProps) {
  return (
    <GoodWidgetProvider config={config} themeOverrides={themeOverrides} defaultTheme={defaultTheme}>
      <PlaceholderInner />
    </GoodWidgetProvider>
  )
}
