/**
 * DataTable — exact-value display with typed columns, formatting, and
 * sorting. Mock datasets are the 5 fixtures from #146 (data-team spec.md).
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { DataTable, XStack, YStack } from '@goodwidget/ui'
import type { DataTableColumnDef } from '@goodwidget/ui'
import { withDefaultPreset } from '../helpers/withDefaultPreset'

const wallets = [
  { address: '0x1a2b...', volume: 1234567, txCount: 847, lastActive: 'Aug 5' },
  { address: '0x3c4d...', volume: 892000, txCount: 623, lastActive: 'Aug 4' },
  { address: '0x5e6f...', volume: 445000, txCount: 312, lastActive: 'Aug 3' },
  { address: '0x7g8h...', volume: 128000, txCount: 95, lastActive: 'Aug 1' },
  { address: '0x9i0j...', volume: 45200, txCount: 42, lastActive: 'Jul 28' },
]

const walletColumns: Array<DataTableColumnDef<(typeof wallets)[number]>> = [
  { key: 'address', label: 'Address', align: 'left', sortable: true },
  { key: 'volume', label: 'Volume', type: 'number', sortable: true },
  { key: 'txCount', label: 'Tx Count', type: 'number', sortable: true },
  { key: 'lastActive', label: 'Last Active' },
]

const metrics = [
  { metric: 'Daily Claims', value: 31500, change: '+8.2%' },
  { metric: 'Active Wallets', value: 12400, change: '+3.1%' },
  { metric: 'Reserve Balance', value: 4500000, change: '-1.2%' },
]

const metricColumns: Array<DataTableColumnDef<(typeof metrics)[number]>> = [
  { key: 'metric', label: 'Metric', align: 'left' },
  { key: 'value', label: 'Value', type: 'number' },
  { key: 'change', label: 'Change' },
]

const empty: Array<(typeof wallets)[number]> = []

const names = [{ name: 'Education Hubs' }, { name: 'Merchant Onboard' }, { name: 'Dev Grants' }]

const nameColumns: Array<DataTableColumnDef<(typeof names)[number]>> = [{ key: 'name', label: 'Category', align: 'left' }]

/** A wallet with unreported volume — exercises rule 8 (null/undefined cells render "--"). */
const walletsWithGaps = [...wallets.slice(0, 3), { address: '0xNULL...', volume: null, txCount: 12, lastActive: 'Jul 20' }]

/** 150 rows with maxHeight=300 — exercises vertical scroll, sticky header, and sort performance at scale. */
const stress = Array.from({ length: 150 }, (_, i) => ({
  rank: i + 1,
  address: `0x${i.toString(16).padStart(8, '0')}`,
  amount: Math.floor(Math.random() * 1000000),
  txCount: Math.floor(Math.random() * 500),
}))

const stressColumns: Array<DataTableColumnDef<(typeof stress)[number]>> = [
  { key: 'rank', label: 'Rank', type: 'number', width: 70 },
  { key: 'address', label: 'Address', align: 'left' },
  { key: 'amount', label: 'Amount', type: 'number', sortable: true },
  { key: 'txCount', label: 'Tx Count', type: 'number', sortable: true },
]

const meta: Meta<typeof DataTable> = {
  title: 'Design System/Primitives/DataTable',
  component: DataTable,
  tags: ['autodocs', 'showcase'],
  parameters: { layout: 'padded' },
  decorators: [withDefaultPreset],
  argTypes: {
    striped: { control: 'boolean' },
    compact: { control: 'boolean' },
    stickyHeader: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['bare', 'card'],
      description: 'Chrome-less vs. card-wrapped face',
    },
  },
}
export default meta
type Story = StoryObj<typeof DataTable>

/** Top wallets, sortable columns, bare and card variants. */
export const Default: Story = {
  render: () => (
    <YStack testID="DataTable-default" data-testid="DataTable-default" gap="$6">
      <XStack flexWrap="wrap" gap="$5">
        <DataTable data={wallets} columns={walletColumns} title="Top Wallets" testID="DataTable-wallets-bare" />
        <DataTable data={wallets} columns={walletColumns} title="Top Wallets" variant="card" testID="DataTable-wallets-card" />
      </XStack>
    </YStack>
  ),
}

/** Compact metrics summary, rendered with compact=true (reduced padding/font, rule 10). */
export const CompactMetrics: Story = {
  render: () => <DataTable data={metrics} columns={metricColumns} title="Key Metrics" compact testID="DataTable-metrics-compact" />,
}

export const EmptyState: Story = {
  render: () => <DataTable data={empty} columns={walletColumns} title="Top Wallets" testID="DataTable-empty" />,
}

export const SingleColumn: Story = {
  render: () => <DataTable data={names} columns={nameColumns} title="Funding Categories" testID="DataTable-names" />,
}

/** Null volume renders "--" (rule 8); onRowPress fires and gives press feedback. */
export const NullValuesAndRowPress: Story = {
  render: () => (
    <DataTable
      data={walletsWithGaps}
      columns={walletColumns}
      title="Top Wallets"
      onRowPress={(row) => console.log('DataTable row pressed', row)}
      testID="DataTable-nulls"
    />
  ),
}

/** 150-row stress test, maxHeight=300 forces vertical scroll with a sticky header; Amount/Tx Count are sortable. */
export const StressTest: Story = {
  render: () => (
    <DataTable data={stress} columns={stressColumns} title="All Wallets" maxHeight={300} testID="DataTable-stress" />
  ),
}

/** Controllable instance — edit args in the Controls panel. */
export const Controllable: Story = {
  args: {
    data: wallets,
    columns: walletColumns,
    title: 'Top Wallets',
    variant: 'card',
  },
}
