import type { Meta, StoryObj } from '@storybook/react'
import { TamaguiProvider } from '@tamagui/core'
import { BuildersS5Dashboard, type BuildersReport, type BuildersS5Data, type TeamReport } from '@goodwidget/gooddata-widget'
import { defaultConfig, YStack } from '@goodwidget/ui'

// Fixture: the stored gbmetrics report dated 2026-11-15 (GET https://gbmetrics.gooddollar.org/getReport?date=2026-11-15,
// read 2026-11-20), copied unchanged so every render and screenshot shows the real numbers and is identical across runs.
// UbeGames has no GitHub keys and Good drops has no Farcaster key in the real report; no retention keys exist yet.
const NOV_15_TEAMS: TeamReport[] = [
  { name: 'Good drops', results: {project_tx_count:11,project_gd_volume:10,project_active_users:0,project_active_gd_users:0,project_onboarded_gd_users:0,s5_project_tx_count:11,s5_project_gd_volume:10,s5_project_gd_transfer_count:1,github_commits:5,github_prs_closed:0,github_score:980,x_followers:89,x_tweets:97} },
  { name: 'UbeGames', results: {project_tx_count:1972,project_gd_volume:0,project_active_users:479,project_active_gd_users:124,project_onboarded_gd_users:5,s5_project_tx_count:1972,s5_project_gd_volume:0,s5_project_gd_transfer_count:0,farcaster_followers:10,x_followers:68,x_tweets:13} },
  { name: 'ACTION-ORDER', results: {project_tx_count:71,project_gd_volume:20300.000056,project_active_users:48,project_active_gd_users:45,project_onboarded_gd_users:36,s5_project_tx_count:71,s5_project_gd_volume:20300.000056,s5_project_gd_transfer_count:15,github_commits:0,github_prs_closed:180,github_score:757,x_followers:145,x_tweets:4721} },
  { name: 'Blockslide', results: {project_tx_count:40,project_gd_volume:55,project_active_users:9,project_active_gd_users:6,project_onboarded_gd_users:1,s5_project_tx_count:40,s5_project_gd_volume:55,s5_project_gd_transfer_count:2,github_commits:32,github_prs_closed:158,github_score:978,farcaster_followers:0,x_followers:27,x_tweets:98} },
  { name: 'Onward', results: {project_tx_count:175,project_gd_volume:20300,project_active_users:7,project_active_gd_users:6,project_onboarded_gd_users:1,s5_project_tx_count:175,s5_project_gd_volume:20300,s5_project_gd_transfer_count:180,github_commits:0,github_prs_closed:70,github_score:803,x_followers:111,x_tweets:36} },
  { name: 'Valor', results: {project_tx_count:1709,project_gd_volume:1701511.364086505,project_active_users:5,project_active_gd_users:4,project_onboarded_gd_users:0,s5_project_tx_count:1709,s5_project_gd_volume:1701511.364086505,s5_project_gd_transfer_count:335,github_commits:24,github_prs_closed:148,github_score:1050,farcaster_followers:3,x_followers:161,x_tweets:433} },
  { name: 'Delulu', results: {project_tx_count:549,project_gd_volume:118270,project_active_users:13,project_active_gd_users:11,project_onboarded_gd_users:2,s5_project_tx_count:549,s5_project_gd_volume:118270,s5_project_gd_transfer_count:101,github_commits:10,github_prs_closed:222,github_score:1040,x_followers:109,x_tweets:275} },
]

function report(status: string): BuildersReport {
  return {
    date: '2026-11-15',
    status,
    errors: status === 'success' ? [] : ['fixture: this report is shown as partial to check the banner'],
    teams: NOV_15_TEAMS,
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
        {/* The dark theme's text is light, so the page needs the theme's own background (the app sets it on <main>). */}
        <YStack backgroundColor="$background" padding="$6" minHeight="100vh">
          <Story />
        </YStack>
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

// Synthetic earlier data exercises the historical chart without implying it is a real report.
export const WithHistory: Story = {
  args: { mockState: { status: 'ready', data: { ...READY, history: [{ ...report('success'), date: '2026-11-08', teams: NOV_15_TEAMS.map((team) => ({ ...team, results: { ...team.results, s5_project_tx_count: Math.floor(team.results.s5_project_tx_count / 2) } })) }] } } },
}
