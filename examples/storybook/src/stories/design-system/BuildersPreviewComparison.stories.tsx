/**
 * Builders season 5 preview comparison — renders the approved dashboard
 * preview's cards with the shared components, to compare by eye at desktop
 * and phone width. Numbers: the Nov 15 weekly report (G$ moved, with its
 * in/out split) and the preview's fixed made-up later weeks (GitHub score).
 * All builders-specific text and colors live in this story only.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { BarChart, Card, Carousel, LineAreaChart, Scorecard, ScorecardGrid, Text, YStack } from '@goodwidget/ui'
import { withDefaultPreset } from '../helpers/withDefaultPreset'

const meta: Meta = {
  title: 'Design System/Examples/Builders S5 Preview Comparison',
  tags: ['showcase'],
  // contentMaxWidthPx stands in for the dashboard page's own width (the preview page's 1120);
  // no component below is given a size: every size comes from the components' text.
  parameters: { layout: 'padded', contentMaxWidthPx: 1120, stretchWrapper: true },
  decorators: [withDefaultPreset],
}
export default meta
type Story = StoryObj

const TEAM_COLOR: Record<string, string> = {
  'Good drops': '#5288cd',
  UbeGames: '#ab5637',
  'ACTION-ORDER': '#3eac80',
  Blockslide: '#be8531',
  Onward: '#ac5370',
  Valor: '#347430',
  Delulu: '#9089db',
}
/** Darker shade = G$ in, lighter shade = G$ out (from the preview). */
const TEAM_SHADES: Record<string, [string, string]> = {
  'Good drops': ['#2971c6', '#98b7de'],
  UbeGames: ['#9f3500', '#c39180'],
  'ACTION-ORDER': ['#06976a', '#9dd2b8'],
  Blockslide: ['#a97004', '#dbbb92'],
  Onward: ['#a0315c', '#c5919f'],
  Valor: ['#0c6b0a', '#789a75'],
  Delulu: ['#7c70d1', '#c0beee'],
}

/** G$ moved in the Nov 15 report, split into in/out (G$). */
const GD_MOVED: Array<{ team: string; total: number; gdIn: number; gdOut: number }> = [
  { team: 'Valor', total: 1701511.364086505, gdIn: 866071.364086505, gdOut: 835440 },
  { team: 'Delulu', total: 118270, gdIn: 99999.99999999999, gdOut: 18270 },
  { team: 'ACTION-ORDER', total: 20300.000056, gdIn: 0, gdOut: 20300.000056 },
  { team: 'Onward', total: 20300, gdIn: 11000, gdOut: 9300 },
  { team: 'Blockslide', total: 55, gdIn: 50, gdOut: 5 },
  { team: 'Good drops', total: 10, gdIn: 10, gdOut: 0 },
  { team: 'UbeGames', total: 0, gdIn: 0, gdOut: 0 },
]

/** GitHub score per report: Nov 15 is real, later weeks are the preview's fixed made-up values. */
const REPORTS = ['Nov 15', 'Nov 22', 'Nov 29', 'Dec 6', 'Dec 13']
const GITHUB_SCORE: Record<string, number[]> = {
  'Good drops': [980, 989, 1003, 1018, 1011],
  'ACTION-ORDER': [757, 745, 727, 729, 720],
  Blockslide: [978, 961, 959, 966, 955],
  Onward: [803, 797, 780, 800, 799],
  Valor: [1050, 1058, 1077, 1082, 1067],
  Delulu: [1040, 1047, 1037, 1024, 1007],
}

/** The preview's number format: whole numbers below 10,000, one-decimal K/M/B above. */
function shortNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs < 10000) return Math.round(value).toLocaleString('en-US')
  const [divisor, suffix] = abs >= 1e9 ? [1e9, 'B'] : abs >= 1e6 ? [1e6, 'M'] : [1e3, 'K']
  return (value / divisor).toFixed(1).replace(/\.0$/, '') + suffix
}
const shortGd = (value: number) => `G$ ${shortNumber(value)}`
const exactGd = (value: number) => `G$ ${Math.round(value).toLocaleString('en-US')}`
const exactNumber = (value: number) => Math.round(value).toLocaleString('en-US')

function MetricCard({ title, children, testID }: { title: string; children: React.ReactNode; testID: string }) {
  return (
    <Card padding="$4" gap="$3" width="100%" data-testid={testID}>
      <Text fontWeight="700" fontSize="$6">
        {title}
      </Text>
      {children}
    </Card>
  )
}

export const GdMovedAndGithubScore: Story = {
  render: () => (
    <YStack width="100%" gap="$4" data-testid="Builders-preview-comparison">
      <MetricCard title="G$ moved between the project's addresses and user wallets" testID="Builders-gd-moved">
        <Carousel
          slideLabels={['Each team · report of Nov 15', 'Teams compared · report of Nov 15']}
          testID="Builders-gd-moved-carousel"
        >
          <ScorecardGrid testID="Builders-gd-moved-tiles">
            {GD_MOVED.map(({ team, total, gdIn, gdOut }) => (
              <Scorecard
                key={team}
                label={team}
                value={total}
                valueFormatter={shortGd}
                detailLines={[`in ${shortGd(gdIn)}`, `out ${shortGd(gdOut)}`]}
                accentColor={TEAM_COLOR[team]}
                variant="tile"
                tooltip={{
                  header: team,
                  subheader: 'G$ moved',
                  rows: [
                    { color: TEAM_COLOR[team], label: 'G$ moved', value: exactGd(total) },
                    { label: 'G$ in', value: exactGd(gdIn) },
                    { label: 'G$ out', value: exactGd(gdOut) },
                  ],
                  rightAlignValues: true,
                  swatchShape: 'square',
                }}
              />
            ))}
          </ScorecardGrid>
          <BarChart
            data={GD_MOVED.map(({ team, total, gdIn, gdOut }) => ({
              category: team,
              value: total,
              color: TEAM_COLOR[team],
              segments: [
                { label: 'G$ in', value: gdIn, color: TEAM_SHADES[team][0] },
                { label: 'G$ out', value: gdOut, color: TEAM_SHADES[team][1] },
              ],
            }))}
            layout="horizontal"
            labelColumns
            legend={[
              { label: 'G$ in (received by the project)', color: '#5c5c5c' },
              { label: 'G$ out (sent by the project)', color: '#b8b8b8' },
            ]}
            swatchShape="square"
            valueFormatter={shortGd}
            tooltip={{ label: 'G$ moved', valueFormatter: exactGd, rightAlignValues: true }}
            showValueAxis={false}
            showGrid={false}
            alwaysShowValueLabels
            testID="Builders-gd-moved-bars"
          />
        </Carousel>
      </MetricCard>
      <MetricCard title="GitHub repository score" testID="Builders-github-score">
        <LineAreaChart
          data={Object.entries(GITHUB_SCORE).flatMap(([team, values]) =>
            values.map((y, index) => ({ x: REPORTS[index], y, series: team })),
          )}
          series={Object.keys(GITHUB_SCORE).map((team) => ({ key: team, label: team, color: TEAM_COLOR[team] }))}
          yAxisFormatter={exactNumber}
          tooltip={{
            label: 'GitHub score',
            valueFormatter: exactNumber,
            xFormatter: (x) => `Report of ${x}`,
            sort: 'desc',
            rightAlignValues: true,
          }}
          legendPosition="top"
          swatchShape="square"
          focusPointOnHover
          testID="Builders-github-score-line"
        />
      </MetricCard>
    </YStack>
  ),
}
