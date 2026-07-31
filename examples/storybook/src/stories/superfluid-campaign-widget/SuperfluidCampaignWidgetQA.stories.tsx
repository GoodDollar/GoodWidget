import type { Meta, StoryObj } from '@storybook/react'
import { SuperfluidCampaignWidget } from '@goodwidget/superfluid-campaign-widget'
import {
  CustodialAirdropStatusStory,
  CustodialLocalFixtureStory,
  LiveDataNoWalletStory,
  NoWalletLeaderboardStory,
  NoWalletStory,
  NoWalletSupTotalsStory,
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

// Unadapted story used with Playwright network routes to verify the real Points
// API response contract, including per-account event enrichment.
export const LeaderboardApiContract: Story = {
  render: () => <LiveDataNoWalletStory initialView="leaderboard" />,
}

// SUP-totals progress bar states — each fixes the protocol-subgraph response via
// supTotalsAdapter so the reward-pool progress bar screenshot is deterministic.
export const SupTotalsRequestFailed: Story = {
  render: () => <NoWalletSupTotalsStory scenario="requestFailed" />,
}

export const SupTotalsPopulated: Story = {
  render: () => <NoWalletSupTotalsStory scenario="populated" />,
}

// Unadapted story used with a mocked subgraph response to verify that a passed
// pool address drives both live distribution and current-member figures.
export const SupTotalsSubgraphContract: Story = {
  render: () => (
    <LiveDataNoWalletStory
      initialView="content"
      poolAddresses={{ 606: '0x1111111111111111111111111111111111111111' }}
    />
  ),
}
