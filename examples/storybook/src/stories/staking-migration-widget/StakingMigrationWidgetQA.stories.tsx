import type { Meta, StoryObj } from '@storybook/react'
import { StakingMigrationWidget } from '@goodwidget/staking-migration-widget'
import {
  ApprovalPendingStory,
  EmptyBalanceStory,
  ErrorStateStory,
  LightThemeReadyStory,
  MigratingStory,
  ReadyStory,
  SuccessStory,
  WrongNetworkStory,
} from '../helpers/stakingMigrationWidgetStories'
import { BRAND_PRESET_OPTIONS, brandPresetOverrides, type BrandPreset } from '../helpers/themeOverridePresets'

interface StakingMigrationWidgetQAArgs {
  defaultTheme: 'light' | 'dark'
  brandPreset: BrandPreset
}

const meta: Meta<StakingMigrationWidgetQAArgs> = {
  title: 'QA/StakingMigrationWidget/Runtime Fixtures',
  component: StakingMigrationWidget,
  tags: ['autodocs', 'qa'],
  parameters: { layout: 'padded' },
  argTypes: {
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
    defaultTheme: 'dark',
    brandPreset: 'None',
  },
}

export default meta
type Story = StoryObj<StakingMigrationWidgetQAArgs>

export const EmptyBalance: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <EmptyBalanceStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const Ready: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <ReadyStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const WrongNetwork: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <WrongNetworkStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const ApprovalPending: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <ApprovalPendingStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const Migrating: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <MigratingStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const Success: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <SuccessStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

export const ErrorState: Story = {
  render: ({ defaultTheme, brandPreset }) => (
    <ErrorStateStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} />
  ),
}

/** Always mounts with defaultTheme="light" regardless of the control, to demonstrate the
 * explicit light-theme branch; brandPreset still applies on top. */
export const LightThemeReady: Story = {
  parameters: {
    goodWidgetProvider: {
      useShell: false,
    },
  },
  render: ({ brandPreset }) => <LightThemeReadyStory themeOverrides={brandPresetOverrides(brandPreset)} />,
}
