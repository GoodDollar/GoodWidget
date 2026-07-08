/**
 * Storybook global preview — wraps every story in GoodWidgetProvider with the
 * light base theme, so Tamagui tokens and themes resolve correctly for all stories.
 */
import React from 'react'
import type { Preview } from '@storybook/react'

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: {
      expanded: true,
    },
    options: {
      storySort: {
        order: ['Start Here', 'Integrators', 'Design System', 'Widgets', 'QA'],
      },
    },
    docs: {
      story: {
        height: '760px',
        inline: false,
      },
      toc: true,
      // Show the story source by default in autodocs
      source: { type: 'dynamic' },
    },
  },
  decorators: [
    (Story) => {
      const story = <Story />

      return <>{story}</>
    },
  ],
}

export default preview
