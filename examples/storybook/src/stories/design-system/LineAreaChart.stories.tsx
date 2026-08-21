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

/** Generates `count` synthetic daily points for the tiered point-count stress stories below (10/100/1000). */
function buildPointStressData(count: number): Array<{ x: string; y: number }> {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(2024, 0, 1)
    date.setDate(date.getDate() + i)
    return {
      x: date.toISOString().slice(0, 10),
      y: 10000 + Math.floor(Math.random() * 5000) + i * 10,
    }
  })
}

const stress10 = buildPointStressData(10)
const stress100 = buildPointStressData(100)
const stress1000 = buildPointStressData(1000)

/** 12 series x 30 points each — exercises multi-series overlay at a series count well past the 5-color theme palette. */
const multiSeriesStress = Array.from({ length: 12 }, (_, seriesIndex) =>
  Array.from({ length: 30 }, (_, pointIndex) => ({
    x: `Day ${pointIndex + 1}`,
    y: 1000 * (seriesIndex + 1) + Math.floor(Math.random() * 500) + pointIndex * 20,
    series: `series-${seriesIndex + 1}`,
  })),
).flat()

const multiSeriesStressDefs = Array.from({ length: 12 }, (_, i) => ({ key: `series-${i + 1}`, label: `Series ${i + 1}` }))

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

/** 1095 daily points (3 years) — dots auto-hide, x-labels thin adaptively, path must not hang the browser.
 * Pre-existing wide-embed case (width={800}, wider than the 480px default widget frame): sets
 * `contentMaxWidthPx` for the same reason as `Stress10Points`/`Stress100Points`/`Stress1000Points`/
 * `StressManySeries` below — see their shared doc comment for the full mechanism. This story predated
 * those and was missed in the original #148 QA follow-up pass; fixed here for consistency (PR #148 review). */
export const StressTest: Story = {
  parameters: { contentMaxWidthPx: 900 },
  render: () => <LineAreaChart data={stress} title="3-Year Reserve Balance" showArea width={800} testID="LineAreaChart-stress" />,
}

/**
 * Tiered point-count stress stories (10/100; 1000+ is `StressTest` above, at
 * 1095 points), per QA follow-up on #148. Degradation strategy is already
 * implemented and verified real (not just claimed) by reading the source:
 * `resolveShowDotsForSeries` hides per-point dots once a series crosses
 * DOT_AUTO_THRESHOLD (20) valid points — a dense line reads better without a
 * dot per pixel. `computeLabelSkipFactor` thins x-axis labels adaptively,
 * sized against the widest actually-formatted label so labels never collide
 * regardless of point count.
 *
 * These, and `StressManySeries` below, set the `contentMaxWidthPx` parameter
 * (read by `withDefaultPreset`): they render at an explicit `width={800}`
 * (a deliberate wide-embed case, wider than the default 480px widget frame),
 * so the outer frame needs a wider `contentMaxWidth` to avoid clipping the
 * chart/legend. Title text itself shrinks-to-fit via `LineAreaChart.tsx`'s
 * own sizing logic; this parameter only addresses the outer-frame width.
 */
export const Stress10Points: Story = {
  parameters: { contentMaxWidthPx: 900 },
  render: () => <LineAreaChart data={stress10} title="Reserve Balance (10 points)" showArea width={800} testID="LineAreaChart-stress-10" />,
}

/** 100 points — past DOT_AUTO_THRESHOLD (20), so dots auto-hide; x-label skip factor kicks in. */
export const Stress100Points: Story = {
  parameters: { contentMaxWidthPx: 900 },
  render: () => <LineAreaChart data={stress100} title="Reserve Balance (100 points)" showArea width={800} testID="LineAreaChart-stress-100" />,
}

/** 1000 points — the top of the requested 10/100/1000 tier (distinct from the pre-existing
 * 1095-point `StressTest` above, which exercises 3-year real-calendar density specifically). */
export const Stress1000Points: Story = {
  parameters: { contentMaxWidthPx: 900 },
  render: () => <LineAreaChart data={stress1000} title="Reserve Balance (1000 points)" showArea width={800} testID="LineAreaChart-stress-1000" />,
}

/**
 * 12 concurrent series, 30 points each — the multi-series-at-scale tier of the
 * stress requirement. Degradation strategy: series color is assigned via
 * `colors[index % colors.length]` against a 5-color theme palette
 * (CHART_COLOR_KEYS), so beyond 5 series colors intentionally repeat — this is
 * a known, accepted constraint of using theme-native colors rather than an
 * unbounded synthetic palette, not an oversight. Callers needing more than 5
 * visually-distinct series should additionally pass a distinct
 * `strokeDasharray` per series (already supported on `LineAreaChartSeriesDef`)
 * so repeated-color series remain distinguishable by line pattern; this story
 * intentionally leaves dasharrays unset to make the color-repeat boundary
 * visible for QA review rather than papering over it.
 */
export const StressManySeries: Story = {
  parameters: { contentMaxWidthPx: 900 },
  render: () => (
    <LineAreaChart
      data={multiSeriesStress}
      series={multiSeriesStressDefs}
      title="12-Series Overlay"
      width={800}
      testID="LineAreaChart-stress-many-series"
    />
  ),
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
