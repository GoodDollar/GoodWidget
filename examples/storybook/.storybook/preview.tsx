/**
 * Storybook global preview — wraps every story in GoodWidgetProvider with the
 * light base theme, so Tamagui tokens and themes resolve correctly for all stories.
 */
import React from 'react'
import type { Preview } from '@storybook/react'
import { GoodWidgetProvider } from '@goodwidget/core'

const preview: Preview = {
  parameters: {
    layout: 'centered',
    docs: {
      // Show the story source by default in autodocs
      source: { type: 'dynamic' },
    },
  },
  decorators: [
    (Story) => (
      <GoodWidgetProvider defaultTheme="light">
        <Story />
      </GoodWidgetProvider>
    ),
  ],
}

export default preview
