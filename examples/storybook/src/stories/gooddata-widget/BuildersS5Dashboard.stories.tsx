import type { Meta, StoryObj } from '@storybook/react'
import { TamaguiProvider } from '@tamagui/core'
import { BuildersS5Dashboard, type BuildersReport, type BuildersS5Data } from '@goodwidget/gooddata-widget'
import { defaultConfig } from '@goodwidget/ui'

// Fixed fixtures (shaped like the real Nov 15 report) so every render and screenshot is identical across runs.
// UbeGames has no GitHub keys and Good drops has no Farcaster key, as in the real report; no return-rate keys exist yet.
function team(name: string, tx: number, gdVolume: number, extra: Record<string, number> = {}) {
  return {
    name,
    results: {
      s5_project_tx_count: tx,
      s5_project_gd_volume: gdVolume,
      s5_project_gd_transfer_count: 3,
      project_active_users: 5,
      project_active_gd_users: 4,
      project_onboarded_gd_users: 1,
      x_followers: 100,
      ...extra,
    },
  }
}

const GITHUB = { github_commits: 24, github_prs_closed: 148, github_score: 1050 }

function report(status: string): BuildersReport {
  return {
    date: '2026-11-15',
    status,
    errors: status === 'success' ? [] : ['github: rate limited'],
    teams: [
      team('Valor', 1709, 1701511.364, { ...GITHUB, farcaster_followers: 3 }),
      team('UbeGames', 1972, 0, { farcaster_followers: 10 }),
      team('ACTION-ORDER', 71, 20300.000056, GITHUB),
      team('Blockslide', 40, 55, { ...GITHUB, farcaster_followers: 0 }),
      team('Onward', 175, 20300, GITHUB),
      team('Good drops', 11, 10, GITHUB),
      team('Delulu', 549, 118270, GITHUB),
    ],
  }
}

const READY: BuildersS5Data = { report: report('success'), firstReportDate: '2026-11-15' }
const PARTIAL: BuildersS5Data = { report: report('partial'), firstReportDate: '2026-11-15' }
const NO_REPORT: BuildersS5Data = { report: null, firstReportDate: null }

const meta: Meta<typeof BuildersS5Dashboard> = {
  title: 'QA/BuildersS5Dashboard/Runtime Fixtures',
  component: BuildersS5Dashboard,
  tags: ['autodocs', 'qa'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <TamaguiProvider config={defaultConfig} defaultTheme="dark">
        <Story />
      </TamaguiProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof BuildersS5Dashboard>

export const LatestReport: Story = {
  args: { mockState: { status: 'ready', data: READY } },
}

export const PartialReport: Story = {
  args: { mockState: { status: 'ready', data: PARTIAL } },
}

export const NoReportYet: Story = {
  args: { mockState: { status: 'ready', data: NO_REPORT } },
}

export const ReportUnavailable: Story = {
  args: { mockState: { status: 'error' } },
}

export const Loading: Story = {
  args: { mockState: { status: 'loading' } },
}
