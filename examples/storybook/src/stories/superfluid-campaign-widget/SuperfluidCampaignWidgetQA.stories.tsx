import type { Meta, StoryObj } from '@storybook/react'
import { MockSuperfluidCampaignWidget } from '@goodwidget/superfluid-campaign-widget/mocked'
import {
  CustodialLocalFixtureStory,
  NoWalletLeaderboardStory,
  NoWalletStory,
  NoWalletSupTotalsStory,
} from '../helpers/superfluidCampaignWidgetStories'

const meta: Meta<typeof MockSuperfluidCampaignWidget> = {
  title: 'QA/SuperfluidCampaignWidget/Runtime Fixtures',
  component: MockSuperfluidCampaignWidget,
  tags: ['autodocs', 'qa'],
  parameters: { layout: 'padded' },
  argTypes: {
    defaultTheme: {
      control: 'radio',
      options: ['dark', 'light'],
      description: "Base theme applied via the widget's own defaultTheme prop.",
    },
  },
  args: { defaultTheme: 'dark' },
}

export default meta
type Story = StoryObj<typeof meta>

export const NoWalletContent: Story = {
  render: ({ defaultTheme }) => <NoWalletStory defaultTheme={defaultTheme} initialView="content" />,
}

export const NoWalletLeaderboard: Story = {
  render: ({ defaultTheme }) => <NoWalletStory defaultTheme={defaultTheme} initialView="leaderboard" />,
}

export const CustodialLocalFixtureContent: Story = {
  render: ({ defaultTheme }) => (
    <CustodialLocalFixtureStory defaultTheme={defaultTheme} initialView="content" />
  ),
}

export const CustodialLocalFixtureLeaderboard: Story = {
  render: ({ defaultTheme }) => (
    <CustodialLocalFixtureStory defaultTheme={defaultTheme} initialView="leaderboard" />
  ),
}

// Campaign leaderboard states — each fixes the Points API response via
// the mocked leaderboard source so the leaderboard/tabs screenshot is deterministic.
export const LeaderboardLoading: Story = {
  render: () => <NoWalletLeaderboardStory scenario="loading" />,
}

export const LeaderboardRequestFailed: Story = {
  render: () => <NoWalletLeaderboardStory scenario="requestFailed" />,
}

export const LeaderboardPopulated: Story = {
  render: () => <NoWalletLeaderboardStory scenario="populated" />,
}

export const LeaderboardEmpty: Story = {
  render: () => <NoWalletLeaderboardStory scenario="empty" />,
}

// SUP-totals progress bar states — each fixes the programs API response via
// the mocked programs source so the reward-pool screenshot is deterministic.
export const SupTotalsRequestFailed: Story = {
  render: () => <NoWalletSupTotalsStory scenario="requestFailed" />,
}

export const SupTotalsLoading: Story = {
  render: () => <NoWalletSupTotalsStory scenario="loading" />,
}

export const SupTotalsNoProgram: Story = {
  render: () => <NoWalletSupTotalsStory scenario="noProgram" />,
}

export const SupTotalsPopulated: Story = {
  render: () => <NoWalletSupTotalsStory scenario="populated" />,
}
