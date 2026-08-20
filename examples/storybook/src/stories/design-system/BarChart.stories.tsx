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

/** 150 categories, maxSlices has no equivalent here — exercises sub-pixel bar clipping and label-truncation safety. */
export const StressTest: Story = {
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
 */
export const Stress10Categories: Story = {
  render: () => <BarChart data={stress10} title="Wallet Activity (10 categories)" width={800} showGrid={false} testID="BarChart-stress-10" />,
}

/** 100 categories — label-skip factor kicks in; roughly every other/every-few-Nth label shows. */
export const Stress100Categories: Story = {
  render: () => <BarChart data={stress100} title="Wallet Activity (100 categories)" width={800} showGrid={false} testID="BarChart-stress-100" />,
}

/** 1000 categories — bars render as a dense honest field; category labels thin to a small readable set instead of converging to empty strings. */
export const Stress1000Categories: Story = {
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
