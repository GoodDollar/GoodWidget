/**
 * Scorecard — KPI card showing a single metric with optional trend indicator.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Scorecard, XStack } from '@goodwidget/ui'
import { withDefaultPreset } from '../helpers/withDefaultPreset'

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

/** All 5 mock-data rows from #139, each rendered in both variants. */
export const Default: Story = {
  args: {
    label: 'Total G$ Spent',
    value: 1900,
    prefix: 'G$',
    format: 'compact',
  },
  render: (args) => (
    <XStack data-testid="Scorecard-default" flexWrap="wrap" gap="$5">
      <Scorecard {...args} variant="bare" testID="Scorecard-bare" />
      <Scorecard label="AI Credits Used" value={284.5} prefix="$" format="decimal" decimals={2} variant="card" />
      <Scorecard label="Active Days" value={28} format="none" variant="card" />
      <Scorecard
        label="Unique Wallets"
        value={47}
        trend={{ value: 15.3, direction: 'up' }}
        trendLabel="vs last 7d"
        variant="card"
      />
      <Scorecard label="Daily Flow Rate" value={2450000} prefix="G$" suffix="/day" format="compact" variant="card" />
    </XStack>
  ),
}

/** Controllable instance — edit args in the Controls panel. */
export const Controllable: Story = {
  args: {
    label: 'Total G$ Spent',
    value: 1900,
    prefix: 'G$',
    format: 'compact',
    variant: 'card',
    size: 'md',
  },
}
