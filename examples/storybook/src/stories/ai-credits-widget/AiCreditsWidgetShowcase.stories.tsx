import type { Meta, StoryObj } from '@storybook/react'
import { AiCreditsWidget } from '@goodwidget/ai-credits-widget'
import {
  InjectedWalletStory,
  MockBackendStory,
  AppKitConnectWalletStory,
} from '../helpers/aiCreditsWidgetStories'

import {
  BRAND_PRESET_OPTIONS,
  brandPresetOverrides,
  type BrandPreset,
} from '../helpers/themeOverridePresets'

interface AiCreditsWidgetStoryArgs {
  defaultTheme: 'light' | 'dark'
  brandPreset: BrandPreset
}

const meta: Meta<AiCreditsWidgetStoryArgs> = {
  title: 'Widgets/AiCreditsWidget/Showcase',
  component: AiCreditsWidget,
  tags: ['integrator', 'manual', 'showcase'],
  parameters: {
    layout: 'padded',
    goodWidgetProvider: {
      disableProvider: true,
      useShell: false,
    },
  },
  argTypes: {
    defaultTheme: {
      control: 'radio',
      options: ['dark', 'light'],
      description: "Base theme applied via the widget's own defaultTheme prop.",
    },
    brandPreset: {
      control: 'select',
      options: BRAND_PRESET_OPTIONS,
      description: 'Sample host-branding themeOverrides preset.',
    },
  },
  args: {
    defaultTheme: 'dark',
    brandPreset: 'None',
  },
}

export default meta
type Story = StoryObj<AiCreditsWidgetStoryArgs>

export const MockBackend: Story = {
  name: 'Mock Backend (browser wallet)',
  render: ({ defaultTheme, brandPreset }) => (
    <MockBackendStory
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
  ),
}

export const InjectedWallet: Story = {
  name: 'Injected Wallet',
  render: ({ defaultTheme, brandPreset }) => (
    <InjectedWalletStory
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
  ),
}

export const WalletConnect: Story = {
  name: 'WalletConnect',
  render: ({ defaultTheme, brandPreset }) => (
    <AppKitConnectWalletStory
      defaultTheme={defaultTheme}
      themeOverrides={brandPresetOverrides(brandPreset)}
    />
  ),
}
