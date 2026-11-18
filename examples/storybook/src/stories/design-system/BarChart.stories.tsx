/**
 * BarChart — discrete categorical comparison via bar length, vertical or
 * horizontal. Mock datasets are the 5 fixtures from #144.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { BarChart, XStack, YStack } from '@goodwidget/ui'
import { withDefaultPreset } from '../helpers/withDefaultPreset'

const chains = [
  { category: 'Celo', value: 45200 },
  { category: 'Fuse', value: 32100 },
  { category: 'Ethereum', value: 8500 },
]

const houses = [
  { category: 'House of Alignment', value: 450000 },
  { category: 'House of Innovation', value: 320000 },
  { category: 'House of Community', value: 180000 },
]

const single = [{ category: 'Total Claims', value: 85800 }]

const empty: Array<{ category: string; value: number }> = []

/** 150 categories — bars become sub-pixel-narrow; must clip/degrade gracefully, not crash. */
const stress = Array.from({ length: 150 }, (_, i) => ({
  category: `Wallet ${String(i + 1).padStart(3, '0')}`,
  value: Math.floor(Math.random() * 100000),
}))

/** Generates `count` synthetic categories for the tiered stress stories below (10/100/1000). */
function buildCategoryStressData(count: number): Array<{ category: string; value: number }> {
  return Array.from({ length: count }, (_, i) => ({
    category: `Wallet ${String(i + 1).padStart(4, '0')}`,
    value: Math.floor(Math.random() * 100000),
  }))
}

const stress10 = buildCategoryStressData(10)
const stress100 = buildCategoryStressData(100)
const stress1000 = buildCategoryStressData(1000)

const meta: Meta<typeof BarChart> = {
  title: 'Design System/Primitives/BarChart',
  component: BarChart,
  tags: ['autodocs', 'showcase'],
  parameters: { layout: 'padded' },
  decorators: [withDefaultPreset],
  argTypes: {
    layout: {
      control: 'select',
      options: ['vertical', 'horizontal'],
      description: 'Bar orientation',
    },
    showGrid: { control: 'boolean' },
    showValueLabels: { control: 'boolean' },
    barCornerRadius: { control: 'number' },
    variant: {
      control: 'select',
      options: ['bare', 'card'],
      description: 'Chrome-less vs. card-wrapped face',
    },
  },
}
export default meta
type Story = StoryObj<typeof BarChart>

/** Claims-by-chain rendered vertical (bare + card) and horizontal, with value labels.
 * Fixed reference story — the Controls panel is inert here; use "Controllable" below to
 * drive props live. */
export const Default: Story = {
  render: () => (
    <YStack testID="BarChart-default" data-testid="BarChart-default" gap="$6">
      <XStack flexWrap="wrap" gap="$5">
        <BarChart
          data={chains}
          title="Claims by Chain"
          width={320}
          testID="BarChart-chains-vertical-bare"
          showValueLabels
        />
        <BarChart
          data={chains}
          title="Claims by Chain"
          width={320}
          variant="card"
          testID="BarChart-chains-vertical-card"
          showValueLabels
        />
      </XStack>
    </YStack>
  ),
}

/** Long category labels — the case horizontal layout exists for. Wider left padding gives labels room. */
export const HorizontalLongLabels: Story = {
  render: () => (
    <BarChart
      data={houses}
      title="Funding by House"
      layout="horizontal"
      width={480}
      height={220}
      padding={{ top: 16, right: 16, bottom: 32, left: 140 }}
      testID="BarChart-houses-horizontal"
      showValueLabels
    />
  ),
}

export const EmptyState: Story = {
  render: () => <BarChart data={empty} title="No Data Yet" width={320} testID="BarChart-empty" />,
}

export const SinglePoint: Story = {
  render: () => <BarChart data={single} title="Total Claims" width={320} testID="BarChart-single" />,
}

/** 150 categories, maxSlices has no equivalent here — exercises sub-pixel bar clipping and label-truncation safety.
 * Pre-existing wide-embed case (width={800}, wider than the 480px default widget frame): sets
 * `contentMaxWidthPx` for the same reason as `Stress10Categories`/`Stress100Categories`/`Stress1000Categories`
 * below — see their shared doc comment for the full mechanism. This story predated those and was missed in
 * the original #148 QA follow-up pass; fixed here for consistency (PR #148 review). */
export const StressTest: Story = {
  parameters: { contentMaxWidthPx: 900, stretchWrapper: true },
  render: () => <BarChart data={stress} title="Wallet Activity" width={800} showGrid={false} testID="BarChart-stress" />,
}

/**
 * Tiered category-count stress stories (10/100/1000), per QA follow-up on #148.
 * Degradation strategy (see computeLabelSkipFactor in BarChart.tsx): bars are
 * NEVER thinned or aggregated — every category always renders its own real
 * bar, since dropping bars would misrepresent the data. Only category-axis
 * LABELS thin adaptively (every Nth label shown, spaced to the widest real
 * label's width) as category count outgrows the available plot width — this
 * is the same problem LineAreaChart already solves for its x-axis, applied
 * here to BarChart's category axis. Value labels separately auto-hide below
 * MIN_BAR_LENGTH_FOR_VALUE_LABEL_PX regardless of category count.
 *
 * These three set the `contentMaxWidthPx` parameter (read by
 * `withDefaultPreset`): they render at an explicit `width={800}` (a
 * deliberate wide-embed case, wider than the default 480px widget frame),
 * so the outer frame needs a wider `contentMaxWidth` to avoid clipping the
 * chart. Title text itself shrinks-to-fit via `BarChart.tsx`'s own sizing
 * logic; this parameter only addresses the outer-frame width.
 */
export const Stress10Categories: Story = {
  parameters: { contentMaxWidthPx: 900, stretchWrapper: true },
  render: () => <BarChart data={stress10} title="Wallet Activity (10 categories)" width={800} showGrid={false} testID="BarChart-stress-10" />,
}

/** 100 categories — label-skip factor kicks in; roughly every other/every-few-Nth label shows. */
export const Stress100Categories: Story = {
  parameters: { contentMaxWidthPx: 900, stretchWrapper: true },
  render: () => <BarChart data={stress100} title="Wallet Activity (100 categories)" width={800} showGrid={false} testID="BarChart-stress-100" />,
}

/** 1000 categories — bars render as a dense honest field; category labels thin to a small readable set instead of converging to empty strings. */
export const Stress1000Categories: Story = {
  parameters: { contentMaxWidthPx: 900, stretchWrapper: true },
  render: () => <BarChart data={stress1000} title="Wallet Activity (1000 categories)" width={800} showGrid={false} testID="BarChart-stress-1000" />,
}

/** No `width` prop — exercises the default `'100%'` responsive path against the
 * real rendered container width, instead of a numeric literal. This is the case
 * that was previously frozen at a hardcoded 400px viewBox regardless of the
 * container's actual size, silently distorting the chart (see #146 QA). */
export const Responsive: Story = {
  render: () => (
    <YStack width="100%" testID="BarChart-responsive" data-testid="BarChart-responsive">
      <BarChart data={chains} title="Claims by Chain (responsive)" testID="BarChart-responsive-chart" showValueLabels />
    </YStack>
  ),
}

/** Fixed per-bar colors (e.g. one color per team), horizontal layout. */
const colored = [
  { category: 'Alpha', value: 45200, color: '#6c5ce7' },
  { category: 'Beta', value: 32100, color: '#00b894' },
  { category: 'Gamma', value: 18500, color: '#e17055' },
  { category: 'Delta', value: 8500, color: '#0984e3' },
]

/** `color` on each data item: every bar draws in its own color; the hover dot matches. */
export const BarColors: Story = {
  render: () => (
    <BarChart
      data={colored}
      title="Per-bar colors"
      layout="horizontal"
      width={480}
      height={220}
      padding={{ top: 16, right: 16, bottom: 32, left: 80 }}
      testID="BarChart-bar-colors"
      showValueLabels
    />
  ),
}

const largeValues = [
  { category: 'Alpha', value: 1701511 },
  { category: 'Beta', value: 866120 },
  { category: 'Gamma', value: 412900 },
]

/** `tooltip`: bars read "1.7M" while the hover box reads the exact "1,701,511", with its
 * own row name ("Claims") and no title drawn in the chart. Hover a bar to see it. */
export const HoverLabelAndExactValue: Story = {
  render: () => (
    <BarChart
      data={largeValues}
      layout="horizontal"
      width={480}
      height={200}
      padding={{ top: 16, right: 16, bottom: 32, left: 80 }}
      tooltip={{ label: 'Claims', valueFormatter: (value) => Math.round(value).toLocaleString('en-US') }}
      testID="BarChart-hover-exact"
      showValueLabels
    />
  ),
}

/** Story-only formatter: whole numbers below 10,000, one-decimal K/M above. */
function shortNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs < 10000) return Math.round(value).toLocaleString('en-US')
  const [divisor, suffix] = abs >= 1e6 ? [1e6, 'M'] : [1e3, 'K']
  return (value / divisor).toFixed(1).replace(/\.0$/, '') + suffix
}

const skewedValues = [
  { category: 'Alpha', value: 1701511 },
  { category: 'Beta', value: 10 },
  { category: 'Gamma', value: 0 },
]

/** `alwaysShowValueLabels`: a tiny bar ("10") and a zero bar ("0") keep their labels next to
 * a 1.7M bar; with plain `showValueLabels` they would be hidden. */
export const ValueLabelsOnEveryBar: Story = {
  render: () => (
    <BarChart
      data={skewedValues}
      layout="horizontal"
      width={480}
      height={200}
      padding={{ top: 16, right: 16, bottom: 32, left: 80 }}
      valueFormatter={shortNumber}
      testID="BarChart-every-label"
      alwaysShowValueLabels
    />
  ),
}

/** `showValueAxis={false}` (with `showGrid={false}`): no number scale, values read from the
 * bar labels only. Horizontal and vertical. */
export const WithoutValueAxis: Story = {
  render: () => (
    <XStack testID="BarChart-no-axis" data-testid="BarChart-no-axis" flexWrap="wrap" gap="$5">
      <BarChart
        data={largeValues}
        layout="horizontal"
        width={480}
        height={200}
        padding={{ top: 16, right: 16, bottom: 32, left: 80 }}
        valueFormatter={shortNumber}
        showValueAxis={false}
        showGrid={false}
        testID="BarChart-no-axis-horizontal"
        showValueLabels
      />
      <BarChart
        data={largeValues}
        width={320}
        valueFormatter={shortNumber}
        showValueAxis={false}
        showGrid={false}
        testID="BarChart-no-axis-vertical"
        showValueLabels
      />
    </XStack>
  ),
}

const exactNumber = (value: number) => Math.round(value).toLocaleString('en-US')

/** Two pieces per bar (e.g. received vs sent), a darker and a lighter shade of each bar's color. */
const twoPieces = [
  {
    category: 'Alpha',
    value: 1701511,
    segments: [
      { label: 'Received', value: 866120, color: '#4b3bb8' },
      { label: 'Sent', value: 835391, color: '#a29bfe' },
    ],
  },
  {
    category: 'Beta',
    value: 412900,
    segments: [
      { label: 'Received', value: 300000, color: '#00806a' },
      { label: 'Sent', value: 112900, color: '#55efc4' },
    ],
  },
  {
    category: 'Gamma',
    value: 95000,
    segments: [
      { label: 'Received', value: 95000, color: '#b34a2a' },
      { label: 'Sent', value: 0, color: '#fab1a0' },
    ],
  },
]

/** `segments` with two pieces: hover a bar to see each piece, then the total (the bar's `value`). */
export const SegmentedBars: Story = {
  render: () => (
    <BarChart
      data={twoPieces}
      layout="horizontal"
      width={480}
      height={200}
      padding={{ top: 16, right: 16, bottom: 32, left: 80 }}
      valueFormatter={shortNumber}
      tooltip={{ label: 'Volume', valueFormatter: exactNumber }}
      showValueAxis={false}
      showGrid={false}
      testID="BarChart-segments-two"
      alwaysShowValueLabels
    />
  ),
}

const threePieces = [
  {
    category: 'North',
    value: 60000,
    segments: [
      { label: 'Direct', value: 30000, color: '#0984e3' },
      { label: 'Referral', value: 20000, color: '#74b9ff' },
      { label: 'Organic', value: 10000, color: '#c7e3ff' },
    ],
  },
  {
    category: 'South',
    value: 42000,
    segments: [
      { label: 'Direct', value: 12000, color: '#0984e3' },
      { label: 'Referral', value: 18000, color: '#74b9ff' },
      { label: 'Organic', value: 12000, color: '#c7e3ff' },
    ],
  },
]

/** `segments` with three pieces, vertical layout, rounded outer edge on the last piece only. */
export const SegmentedBarsThreePieces: Story = {
  render: () => (
    <BarChart
      data={threePieces}
      width={320}
      valueFormatter={shortNumber}
      tooltip={{ label: 'Visits', valueFormatter: exactNumber }}
      barCornerRadius={4}
      testID="BarChart-segments-three"
      showValueLabels
    />
  ),
}

/** Failure cases, drawn as given rather than corrected silently: "Mismatch" has pieces adding up
 * to 70,000 while its value is 100,000 (bar length shows 70K, label and hover total read 100K);
 * "Negative" has a -10,000 piece, which is dropped. */
const segmentEdgeCases = [
  {
    category: 'Mismatch',
    value: 100000,
    segments: [
      { label: 'Received', value: 40000, color: '#4b3bb8' },
      { label: 'Sent', value: 30000, color: '#a29bfe' },
    ],
  },
  {
    category: 'Negative',
    value: 50000,
    segments: [
      { label: 'Received', value: 50000, color: '#00806a' },
      { label: 'Sent', value: -10000, color: '#55efc4' },
    ],
  },
]

export const SegmentedBarsEdgeCases: Story = {
  render: () => (
    <BarChart
      data={segmentEdgeCases}
      layout="horizontal"
      width={480}
      height={160}
      padding={{ top: 16, right: 16, bottom: 32, left: 80 }}
      valueFormatter={shortNumber}
      tooltip={{ valueFormatter: exactNumber }}
      testID="BarChart-segments-edge"
      showValueLabels
    />
  ),
}

/** Controllable instance — edit args in the Controls panel. */
export const Controllable: Story = {
  args: {
    data: chains,
    title: 'Claims by Chain',
    width: 320,
    variant: 'card',
    layout: 'vertical',
    showGrid: true,
    showValueLabels: false,
    barCornerRadius: 0,
  },
  render: (args) => <BarChart {...args} testID="BarChart-controllable" />,
}
