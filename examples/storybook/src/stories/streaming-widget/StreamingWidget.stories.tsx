import type { Meta, StoryObj } from '@storybook/react'
import { StreamingWidget } from '@goodwidget/streaming-widget'
import { InjectedWalletStory } from '../helpers/streamingWidgetStories'
import { BRAND_PRESET_OPTIONS, brandPresetOverrides, type BrandPreset } from '../helpers/themeOverridePresets'

interface StreamingWidgetStoryArgs {
  apiKey?: string
  defaultTheme: 'light' | 'dark'
  brandPreset: BrandPreset
}

const meta: Meta<StreamingWidgetStoryArgs> = {
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
    defaultTheme: {
      control: 'radio',
      options: ['dark', 'light'],
      description: 'Base theme applied via the widget’s own defaultTheme prop.',
    },
    brandPreset: {
      control: 'select',
      options: BRAND_PRESET_OPTIONS,
      description: 'Sample host-branding themeOverrides preset.',
    },
  },
  args: {
    apiKey: '',
    defaultTheme: 'dark',
    brandPreset: 'None',
  },
}

export default meta
type Story = StoryObj<StreamingWidgetStoryArgs>

export const InjectedWallet: Story = {
  render: ({ apiKey, defaultTheme, brandPreset }) => (
    <InjectedWalletStory
      apiKey={apiKey}
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
  ),
}
