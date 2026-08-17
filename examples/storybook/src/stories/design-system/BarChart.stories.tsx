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
