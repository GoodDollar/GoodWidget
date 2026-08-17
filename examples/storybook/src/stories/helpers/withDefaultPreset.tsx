import React from 'react'
import type { Decorator } from '@storybook/react'
import { GoodWidgetProvider } from '@goodwidget/core'
import { YStack } from '@goodwidget/ui'

/**
 * Makes a design-system story render with GoodWidget's shipped visual baseline.
 *
 * It is intentionally scoped to primitive/theming stories and should only be used by ui package components.
 * Full widget stories must be shipped with their own GoodWidgetProvider setup.
 */
export const withDefaultPreset: Decorator = (Story) => (
  <GoodWidgetProvider defaultTheme="dark">
    <YStack padding="$4">
      <Story />
    </YStack>
  </GoodWidgetProvider>
)
