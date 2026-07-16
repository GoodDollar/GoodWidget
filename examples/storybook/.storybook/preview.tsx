/** Storybook global preview. Runtime providers are declared by each story when needed. */
import type { Preview } from '@storybook/react'

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: {
      expanded: true,
      disableSaveFromUI: true,
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
}

export default preview
