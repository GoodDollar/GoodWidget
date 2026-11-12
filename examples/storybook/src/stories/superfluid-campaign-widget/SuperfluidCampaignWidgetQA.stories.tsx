import React, { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import type { Meta, StoryObj } from '@storybook/react'
import { GoodWidgetProvider } from '@goodwidget/core'
import { MockSuperfluidCampaignWidget } from '@goodwidget/superfluid-campaign-widget/mocked'
import { Tooltip } from '@goodwidget/ui'
import {
  GOODWALLET_STORY_LINKS,
  STANDALONE_STORY_LINKS,
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

// Season 7 integrator link sets: the standalone app and the GoodWallet-hosted widget
// use different tracked links for the same cards.
export const StandaloneLinksContent: Story = {
  render: ({ defaultTheme }) => (
    <NoWalletStory
      defaultTheme={defaultTheme}
      initialView="content"
      {...STANDALONE_STORY_LINKS}
    />
  ),
}

export const GoodWalletLinksContent: Story = {
  render: ({ defaultTheme }) => (
    <NoWalletStory
      defaultTheme={defaultTheme}
      initialView="content"
      {...GOODWALLET_STORY_LINKS}
    />
  ),
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

function ShadowRootTooltipFixture() {
  return (
    <div style={{ width: 280, padding: 12 }}>
      <div
        data-testid="shadow-tooltip-scroll"
        style={{ height: 100, overflowY: 'auto', border: '1px solid currentColor' }}
      >
        <div style={{ height: 320, display: 'flex', alignItems: 'flex-end', padding: 16 }}>
          <Tooltip label="Shadow action">
            <span data-testid="shadow-tooltip-trigger">Shadow tooltip trigger</span>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

function ShadowRootTooltipStory() {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const shadowRoot = hostRef.current?.attachShadow({ mode: 'open' })
    if (!shadowRoot) return undefined

    const mountPoint = document.createElement('div')
    shadowRoot.appendChild(mountPoint)
    const root = createRoot(mountPoint)
    root.render(
      <GoodWidgetProvider>
        <ShadowRootTooltipFixture />
      </GoodWidgetProvider>,
    )
    return () => root.unmount()
  }, [])

  return (
    <div>
      Shadow root tooltip fixture
      <div ref={hostRef} />
    </div>
  )
}

export const ShadowRootTooltip: Story = {
  render: () => <ShadowRootTooltipStory />,
}
