import type { Meta, StoryObj } from '@storybook/react'
import { SuperfluidCampaignWidget } from '@goodwidget/superfluid-campaign-widget'
import {
  CustodialAirdropStatusStory,
  CustodialLocalFixtureStory,
  NoWalletLeaderboardStory,
  NoWalletStory,
} from '../helpers/superfluidCampaignWidgetStories'

const meta: Meta<typeof SuperfluidCampaignWidget> = {
  title: 'QA/SuperfluidCampaignWidget/Runtime Fixtures',
  component: SuperfluidCampaignWidget,
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
// airdropStatusAdapter so the leaderboard screenshot is deterministic.
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
// leaderboardAdapter so the leaderboard/tabs screenshot is deterministic.
export const LeaderboardLoading: Story = {
  render: () => <NoWalletLeaderboardStory scenario="loading" />,
}

export const LeaderboardRequestFailed: Story = {
  render: () => <NoWalletLeaderboardStory scenario="requestFailed" />,
}

export const LeaderboardPopulated: Story = {
  render: () => <NoWalletLeaderboardStory scenario="populated" />,
}
