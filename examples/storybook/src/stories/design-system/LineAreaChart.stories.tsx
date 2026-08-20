/**
 * LineAreaChart — time-series trends via connected line segments, optionally
 * filled to a gradient area. Mock datasets are the 5 fixtures from #145.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { LineAreaChart, XStack, YStack } from '@goodwidget/ui'
import { withDefaultPreset } from '../helpers/withDefaultPreset'

const daily = [
  { x: 'Jul 24', y: 18200 },
  { x: 'Jul 25', y: 19400 },
  { x: 'Jul 26', y: 17800 },
  { x: 'Jul 27', y: 21000 },
  { x: 'Jul 28', y: 22500 },
  { x: 'Jul 29', y: 20100 },
  { x: 'Jul 30', y: 23800 },
  { x: 'Jul 31', y: 25200 },
  { x: 'Aug 1', y: 24100 },
  { x: 'Aug 2', y: 26800 },
  { x: 'Aug 3', y: 28400 },
  { x: 'Aug 4', y: 27200 },
  { x: 'Aug 5', y: 30100 },
  { x: 'Aug 6', y: 31500 },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
const CLAIMS_BY_MONTH = [12000, 14500, 13800, 16200, 18400, 17100, 19800]
const PRICE_BY_MONTH = [0.012, 0.011, 0.0125, 0.013, 0.0142, 0.0138, 0.0155]
const multiAxis = MONTHS.flatMap((month, index) => [
  { x: month, y: CLAIMS_BY_MONTH[index], series: 'claims' },
  { x: month, y: PRICE_BY_MONTH[index], series: 'price' },
])

const withGap = [
  { x: 'Day 1', y: 100 },
  { x: 'Day 2', y: 120 },
  { x: 'Day 3', y: null },
  { x: 'Day 4', y: null },
  { x: 'Day 5', y: 150 },
  { x: 'Day 6', y: 160 },
]

const empty: Array<{ x: string; y: number | null }> = []

const single = [{ x: 'Today', y: 24100 }]

/** 1095 days (3 years) — line becomes very dense; must render without crash/hang and thin x-labels adaptively. */
const stress = Array.from({ length: 1095 }, (_, i) => {
  const date = new Date(2024, 0, 1)
  date.setDate(date.getDate() + i)
  return {
    x: date.toISOString().slice(0, 10),
    y: 10000 + Math.floor(Math.random() * 5000) + i * 10,
  }
})

const meta: Meta<typeof LineAreaChart> = {
  title: 'Design System/Primitives/LineAreaChart',
  component: LineAreaChart,
  tags: ['autodocs', 'showcase'],
  parameters: { layout: 'padded' },
  decorators: [withDefaultPreset],
  argTypes: {
    type: {
      control: 'select',
      options: ['linear', 'monotone', 'step'],
      description: 'Interpolation curve',
    },
    showArea: { control: 'boolean' },
    showDots: { control: 'select', options: [true, false, 'auto'] },
    showGrid: { control: 'boolean' },
    connectNulls: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['bare', 'card'],
      description: 'Chrome-less vs. card-wrapped face',
    },
  },
}
export default meta
type Story = StoryObj<typeof LineAreaChart>

/** Daily claims with area fill and a target reference line, shown across linear/monotone/step interpolation and the card variant.
 * Fixed reference story — the Controls panel is inert here; use "Controllable" below to
 * drive props live. */
export const Default: Story = {
  render: () => (
    <YStack testID="LineAreaChart-default" data-testid="LineAreaChart-default" gap="$6">
      <XStack flexWrap="wrap" gap="$5">
        <LineAreaChart
          data={daily}
          title="Daily UBI Claims"
          showArea
          referenceLines={[{ value: 25000, label: 'Target' }]}
          width={420}
          testID="LineAreaChart-daily-linear"
        />
        <LineAreaChart
          data={daily}
          title="Daily UBI Claims (monotone)"
          type="monotone"
          showArea
          referenceLines={[{ value: 25000, label: 'Target' }]}
          width={420}
          variant="card"
          testID="LineAreaChart-daily-monotone-card"
        />
      </XStack>
    </YStack>
  ),
}

export const StepInterpolation: Story = {
  render: () => <LineAreaChart data={daily} title="Daily UBI Claims (step)" type="step" width={420} testID="LineAreaChart-step" />,
}

/** Multi-series with a secondary y-axis for the price series (different scale/units from claims). */
export const MultiSeriesSecondaryAxis: Story = {
  render: () => (
    <LineAreaChart
      data={multiAxis}
      title="Claims vs. G$ Price"
      series={[
        { key: 'claims', label: 'Claims' },
        { key: 'price', label: 'G$ Price' },
      ]}
      secondaryYAxis={{ key: 'price', label: 'G$ Price', formatter: (value) => `$${value}` }}
      width={480}
      testID="LineAreaChart-multi-axis"
    />
  ),
}

/** connectNulls=false (default, visible gap) vs. true (bridged) side by side. */
export const WithGap: Story = {
  render: () => (
    <XStack flexWrap="wrap" gap="$5" testID="LineAreaChart-with-gap" data-testid="LineAreaChart-with-gap">
      <LineAreaChart data={withGap} title="Gap (visible)" width={320} testID="LineAreaChart-gap-visible" />
      <LineAreaChart data={withGap} title="Gap (bridged)" connectNulls width={320} testID="LineAreaChart-gap-bridged" />
    </XStack>
  ),
}

export const EmptyState: Story = {
  render: () => <LineAreaChart data={empty} title="No Data Yet" width={320} testID="LineAreaChart-empty" />,
}

export const SinglePoint: Story = {
  render: () => <LineAreaChart data={single} title="Today's Claims" width={320} testID="LineAreaChart-single" />,
}

/** 1095 daily points (3 years) — dots auto-hide, x-labels thin adaptively, path must not hang the browser. */
export const StressTest: Story = {
  render: () => <LineAreaChart data={stress} title="3-Year Reserve Balance" showArea width={800} testID="LineAreaChart-stress" />,
}

/** No `width` prop — exercises the default `'100%'` responsive path against the
 * real rendered container width, instead of a numeric literal. This is the case
 * that was previously frozen at a hardcoded 400px viewBox regardless of the
 * container's actual size, silently distorting the chart (see #146 QA). */
export const Responsive: Story = {
  render: () => (
    <YStack width="100%" testID="LineAreaChart-responsive" data-testid="LineAreaChart-responsive">
      <LineAreaChart data={daily} title="Daily UBI Claims (responsive)" showArea testID="LineAreaChart-responsive-chart" />
    </YStack>
  ),
}

/** Controllable instance — edit args in the Controls panel. */
export const Controllable: Story = {
  args: {
    data: daily,
    title: 'Daily UBI Claims',
    showArea: true,
    width: 420,
    variant: 'card',
    type: 'linear',
    showDots: 'auto',
    showGrid: true,
    connectNulls: false,
  },
  render: (args) => <LineAreaChart {...args} testID="LineAreaChart-controllable" />,
}
