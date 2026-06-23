import type { Meta, StoryObj } from '@storybook/react'
import { StreamingWidget, type StreamingWidgetProps } from '@goodwidget/streaming-widget'
import { InjectedWalletStory } from '../helpers/streamingWidgetStories'

const meta: Meta<typeof StreamingWidget> = {
  title: 'Widgets/StreamingWidget/Showcase',
  component: StreamingWidget,
  tags: ['integrator', 'manual', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    apiKey: {
      control: 'text',
      name: 'TheGraph API key',
      description:
        'Optional TheGraph key passed to the SDK-backed streaming adapter for Base SUP reserve queries.',
    },
  },
  args: {
    apiKey: '',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const InjectedWallet: Story = {
  parameters: {
    goodWidgetProvider: {
      useShell: false,
    },
  },
  render: ({ apiKey }: Pick<StreamingWidgetProps, 'apiKey'>) => (
    <InjectedWalletStory apiKey={apiKey} />
  ),
}
