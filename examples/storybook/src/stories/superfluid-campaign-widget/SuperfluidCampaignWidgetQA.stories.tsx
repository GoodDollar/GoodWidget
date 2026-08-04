import type { Meta, StoryObj } from '@storybook/react'
import { MockSuperfluidCampaignWidget } from '@goodwidget/superfluid-campaign-widget/mocked'
import {
  CustodialAirdropStatusStory,
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
}

export default meta
type Story = StoryObj<typeof meta>

export const NoWalletContent: Story = {
  render: () => <NoWalletStory initialView="content" />,
}

export const NoWalletLeaderboard: Story = {
  render: () => <NoWalletStory initialView="leaderboard" />,
}

export const CustodialLocalFixtureContent: Story = {
  render: () => <CustodialLocalFixtureStory initialView="content" />,
}

export const CustodialLocalFixtureLeaderboard: Story = {
  render: () => <CustodialLocalFixtureStory initialView="leaderboard" />,
}

// Airdrop-status card states — each fixes the live endpoint's response via
// the mocked airdrop source so the leaderboard screenshot is deterministic.
export const AirdropStatusLoading: Story = {
  render: () => <CustodialAirdropStatusStory scenario="loading" />,
}

export const AirdropStatusRequestFailed: Story = {
  render: () => <CustodialAirdropStatusStory scenario="requestFailed" />,
}

export const AirdropStatusNotWhitelisted: Story = {
  render: () => <CustodialAirdropStatusStory scenario="notWhitelisted" />,
}

export const AirdropStatusEligible: Story = {
  render: () => <CustodialAirdropStatusStory scenario="eligible" />,
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
