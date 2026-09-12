/**
 * Scorecard — KPI card showing a single metric with optional trend indicator.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Scorecard, XStack, YStack } from '@goodwidget/ui'
import type { ScorecardProps } from '@goodwidget/ui'
import { withDefaultPreset } from '../helpers/withDefaultPreset'

/** The 5 mock-data rows from #139, reused to render both the bare and card variants. */
const MOCK_ROWS: Array<{ slug: string; props: Omit<ScorecardProps, 'variant' | 'testID'> }> = [
  { slug: 'total-spent', props: { label: 'Total G$ Spent', value: 1900, prefix: 'G$', format: 'compact' } },
  { slug: 'ai-credits', props: { label: 'AI Credits Used', value: 284.5, prefix: '$', format: 'decimal', decimals: 2 } },
  { slug: 'active-days', props: { label: 'Active Days', value: 28, format: 'none' } },
  {
    slug: 'unique-wallets',
    props: {
      label: 'Unique Wallets',
      value: 47,
      trend: { value: 15.3, direction: 'up' },
      trendLabel: 'vs last 7d',
      subtitle: 'Last 30 days',
    },
  },
  {
    slug: 'daily-flow-rate',
    props: { label: 'Daily Flow Rate', value: 2450000, prefix: 'G$', suffix: '/day', format: 'compact', subtitle: 'From AntSeed vault' },
  },
]

const meta: Meta<typeof Scorecard> = {
  title: 'Design System/Primitives/Scorecard',
  component: Scorecard,
  tags: ['autodocs', 'showcase'],
  parameters: { layout: 'padded' },
  decorators: [withDefaultPreset],
  argTypes: {
    value: { control: 'number', description: 'The metric value to display' },
    label: { control: 'text', description: 'What the metric represents' },
    prefix: { control: 'text', description: 'Unit before the value' },
    suffix: { control: 'text', description: 'Unit after the value' },
    format: {
      control: 'select',
      options: ['compact', 'decimal', 'none'],
      description: 'Number formatting mode',
    },
    decimals: { control: 'number', description: 'Decimal precision' },
    subtitle: { control: 'text', description: 'Short contextual/source note rendered below the trend row (or value row if no trend)' },
    variant: {
      control: 'select',
      options: ['bare', 'card'],
      description: 'Chrome-less vs. card-wrapped face',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Typography size preset',
    },
  },
}
export default meta
type Story = StoryObj<typeof Scorecard>

/** All 5 mock-data rows from #139, each rendered in both the bare and card variant.
 * Fixed reference story — the Controls panel is inert here; use "Controllable" below to
 * drive props live. */
export const Default: Story = {
  render: () => (
    <YStack testID="Scorecard-default" data-testid="Scorecard-default" gap="$6">
      <XStack flexWrap="wrap" gap="$5">
        {MOCK_ROWS.map(({ slug, props }) => (
          <Scorecard key={slug} {...props} variant="bare" testID={`Scorecard-${slug}-bare`} />
        ))}
      </XStack>
      <XStack flexWrap="wrap" gap="$5">
        {MOCK_ROWS.map(({ slug, props }) => (
          <Scorecard key={slug} {...props} variant="card" testID={`Scorecard-${slug}-card`} />
        ))}
      </XStack>
    </YStack>
  ),
}

/** Controllable instance — edit args in the Controls panel. */
export const Controllable: Story = {
  args: {
    label: 'Total G$ Spent',
    value: 1900,
    prefix: 'G$',
    suffix: '',
    format: 'compact',
    decimals: 1,
    subtitle: '',
    variant: 'card',
    size: 'md',
  },
  render: (args) => <Scorecard {...args} testID="Scorecard-controllable" />,
}
