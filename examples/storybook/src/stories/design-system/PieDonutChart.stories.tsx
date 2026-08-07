/**
 * PieDonutChart — proportional arc segments for categorical data, with
 * optional donut center content. Mock datasets are the 5 fixtures from #143.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { PieDonutChart, XStack, YStack } from '@goodwidget/ui'
import { withDefaultPreset } from '../helpers/withDefaultPreset'

const funding = [
  { label: 'Education Hubs', value: 157500 },
  { label: 'Merchant Onboard', value: 112500 },
  { label: 'Dev Grants', value: 90000 },
  { label: 'Creator Fund', value: 90000 },
]

const single = [{ label: 'UBI Distribution', value: 1000000 }]

const nearEqual = [
  { label: 'Celo', value: 51 },
  { label: 'Fuse', value: 49 },
]

const empty: Array<{ label: string; value: number }> = []

/** 120 items forces maxSlices=7 aggregation: top 6 kept + one massive "Other". */
const stress = Array.from({ length: 120 }, (_, i) => ({
  label: `Category ${i + 1}`,
  value: Math.floor(Math.random() * 10000) + 100,
}))

const meta: Meta<typeof PieDonutChart> = {
  title: 'Design System/Primitives/PieDonutChart',
  component: PieDonutChart,
  tags: ['autodocs', 'showcase'],
  parameters: { layout: 'padded' },
  decorators: [withDefaultPreset],
  argTypes: {
    innerRadius: { control: 'number', description: 'Fraction of outer radius that is hollow (0 = pie, >0 = donut)' },
    maxSlices: { control: 'number', description: 'Max segments before aggregating the tail into "Other"' },
    sort: {
      control: 'select',
      options: ['descending', 'ascending', 'none'],
      description: 'Segment display order',
    },
    showLegend: { control: 'boolean' },
    showPercentages: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['bare', 'card'],
      description: 'Chrome-less vs. card-wrapped face',
    },
  },
}
export default meta
type Story = StoryObj<typeof PieDonutChart>

/** Funding breakdown rendered as both a pie and a donut, in bare and card variants. */
export const Default: Story = {
  render: () => (
    <YStack testID="PieDonutChart-default" data-testid="PieDonutChart-default" gap="$6">
      <XStack flexWrap="wrap" gap="$5">
        <PieDonutChart
          data={funding}
          title="Funding Distribution"
          innerRadius={0}
          testID="PieDonutChart-funding-pie-bare"
        />
        <PieDonutChart
          data={funding}
          title="Funding Distribution"
          innerRadius={0.6}
          centerLabel="Total"
          centerValue={funding.reduce((sum, item) => sum + item.value, 0)}
          testID="PieDonutChart-funding-donut-bare"
        />
        <PieDonutChart
          data={funding}
          title="Funding Distribution"
          innerRadius={0.6}
          centerLabel="Total"
          centerValue={funding.reduce((sum, item) => sum + item.value, 0)}
          variant="card"
          testID="PieDonutChart-funding-donut-card"
        />
      </XStack>
    </YStack>
  ),
}

export const EmptyState: Story = {
  render: () => <PieDonutChart data={empty} title="No Data Yet" testID="PieDonutChart-empty" />,
}

export const SinglePoint: Story = {
  render: () => <PieDonutChart data={single} title="UBI Distribution" testID="PieDonutChart-single" />,
}

export const NearEqualSplit: Story = {
  render: () => <PieDonutChart data={nearEqual} title="Chain Split" innerRadius={0} testID="PieDonutChart-near-equal" />,
}

/** 120 categories, maxSlices=7 — exercises aggregation math and legend overflow safety. */
export const StressTest: Story = {
  render: () => <PieDonutChart data={stress} title="Category Breakdown" maxSlices={7} testID="PieDonutChart-stress" />,
}

/** Controllable instance — edit args in the Controls panel. */
export const Controllable: Story = {
  args: {
    data: funding,
    title: 'Funding Distribution',
    innerRadius: 0.6,
    variant: 'card',
  },
}
