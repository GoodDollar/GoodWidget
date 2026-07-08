/**
 * Storybook global preview — wraps every story in GoodWidgetProvider with the
 * light base theme, so Tamagui tokens and themes resolve correctly for all stories.
 */
import React from 'react'
import type { Preview } from '@storybook/react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { GoodWidgetConfig } from '@goodwidget/ui'
import { MiniAppShell } from '@goodwidget/ui'

interface StoryGoodWidgetParameters {
  config?: GoodWidgetConfig
  defaultTheme?: 'light' | 'dark'
  disableProvider?: boolean
  useShell?: boolean
}

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
    (Story, context) => {
      const params = (context.parameters.goodWidgetProvider ?? {}) as StoryGoodWidgetParameters
      const story = <Story />
      const content =
        params.useShell === false ? (
          story
        ) : (
          <MiniAppShell title="GoodWidgetDemos" headerRight={undefined}>
            {story}
          </MiniAppShell>
        )

      if (params.disableProvider) {
        return params.useShell === false ? (
          story
        ) : (
          <MiniAppShell title="GoodWidgetDemos" headerRight={undefined}>
            {story}
          </MiniAppShell>
        )
      }

      return (
        <GoodWidgetProvider config={params.config} defaultTheme={params.defaultTheme ?? 'dark'}>
          {content}
        </GoodWidgetProvider>
      )
    },
  ],
}

export default preview
