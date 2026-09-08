import type { Meta, StoryObj } from '@storybook/react'
import { BRAND_PRESET_OPTIONS, brandPresetOverrides, type BrandPreset } from '../helpers/themeOverridePresets'
import { MockSuperfluidCampaignWidget } from '@goodwidget/superfluid-campaign-widget/mocked'
import {
  CustodialLocalFixtureStory,
  NoWalletLeaderboardStory,
  NoWalletStory,
  NoWalletSupTotalsStory,
} from '../helpers/superfluidCampaignWidgetStories'

interface SuperfluidCampaignQAArgs {
  defaultTheme: 'light' | 'dark'
  brandPreset: BrandPreset
}

const meta: Meta<SuperfluidCampaignQAArgs> = {
  title: 'QA/SuperfluidCampaignWidget/Runtime Fixtures',
  component: MockSuperfluidCampaignWidget,
  tags: ['autodocs', 'qa'],
  parameters: { layout: 'padded' },
  argTypes: {
    defaultTheme: { control: 'radio', options: ['dark', 'light'] },
    brandPreset: { control: 'select', options: BRAND_PRESET_OPTIONS },
  },
  args: {
    defaultTheme: 'dark',
    brandPreset: 'None',
  },
}

export default meta
type Story = StoryObj<SuperfluidCampaignQAArgs>

export const NoWalletContent: Story = {
  render: ({ defaultTheme, brandPreset }) => <NoWalletStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} initialView="content" />,
}

export const NoWalletLeaderboard: Story = {
  render: ({ defaultTheme, brandPreset }) => <NoWalletStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} initialView="leaderboard" />,
}

export const CustodialLocalFixtureContent: Story = {
  render: ({ defaultTheme, brandPreset }) => <CustodialLocalFixtureStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} initialView="content" />,
}

export const CustodialLocalFixtureLeaderboard: Story = {
  render: ({ defaultTheme, brandPreset }) => <CustodialLocalFixtureStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} initialView="leaderboard" />,
}

// Campaign leaderboard states — each fixes the Points API response via
// the mocked leaderboard source so the leaderboard/tabs screenshot is deterministic.
export const LeaderboardLoading: Story = {
  render: ({ defaultTheme, brandPreset }) => <NoWalletLeaderboardStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} scenario="loading" />,
}

export const LeaderboardRequestFailed: Story = {
  render: ({ defaultTheme, brandPreset }) => <NoWalletLeaderboardStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} scenario="requestFailed" />,
}

export const LeaderboardPopulated: Story = {
  render: ({ defaultTheme, brandPreset }) => <NoWalletLeaderboardStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} scenario="populated" />,
}

export const LeaderboardEmpty: Story = {
  render: ({ defaultTheme, brandPreset }) => <NoWalletLeaderboardStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} scenario="empty" />,
}

// SUP-totals progress bar states — each fixes the programs API response via
// the mocked programs source so the reward-pool screenshot is deterministic.
export const SupTotalsRequestFailed: Story = {
  render: ({ defaultTheme, brandPreset }) => <NoWalletSupTotalsStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} scenario="requestFailed" />,
}

export const SupTotalsLoading: Story = {
  render: ({ defaultTheme, brandPreset }) => <NoWalletSupTotalsStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} scenario="loading" />,
}

export const SupTotalsNoProgram: Story = {
  render: ({ defaultTheme, brandPreset }) => <NoWalletSupTotalsStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} scenario="noProgram" />,
}

export const SupTotalsPopulated: Story = {
  render: ({ defaultTheme, brandPreset }) => <NoWalletSupTotalsStory defaultTheme={defaultTheme} themeOverrides={brandPresetOverrides(brandPreset)} scenario="populated" />,
}
