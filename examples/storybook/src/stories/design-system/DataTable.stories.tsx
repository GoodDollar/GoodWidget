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

/** Builds `count` synthetic numeric columns (`metric0`, `metric1`, ...) plus their column defs, for the column-count stress tiers below (10/50/100). */
function buildManyColumnsFixture(columnCount: number, rowCount: number) {
  const columns: Array<DataTableColumnDef<Record<string, unknown>>> = Array.from({ length: columnCount }, (_, i) => ({
    key: `metric${i}`,
    label: `Metric ${i + 1}`,
    type: 'number',
  }))
  const rows: Array<Record<string, unknown>> = Array.from({ length: rowCount }, (_, rowIndex) => {
    const row: Record<string, unknown> = { id: rowIndex }
    columns.forEach((column, columnIndex) => {
      row[column.key] = rowIndex * 1000 + columnIndex
    })
    return row
  })
  return { columns, rows }
}

const manyColumns10 = buildManyColumnsFixture(10, 20)
const manyColumns50 = buildManyColumnsFixture(50, 20)
const manyColumns100 = buildManyColumnsFixture(100, 20)

/** 1200 rows, same shape as `stress` above — the row-count stress tier. */
const manyRows = Array.from({ length: 1200 }, (_, i) => ({
  rank: i + 1,
  address: `0x${i.toString(16).padStart(8, '0')}`,
  amount: Math.floor(Math.random() * 1000000),
  txCount: Math.floor(Math.random() * 500),
}))

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

/**
 * `ColumnDef.width` lives nested inside the `columns` array, one level too
 * deep for Storybook's docgen to auto-infer a usable control for — arrays of
 * objects render as an inert JSON blob in the Controls panel, not an editable
 * field. `addressColumnWidthPx` is a story-only arg (not a real DataTable
 * prop) that bridges a top-level, genuinely interactive range control to the
 * "Address" column's `width`, rebuilding `columns` with it on every render.
 */
type ControllableArgs = React.ComponentProps<typeof DataTable> & { addressColumnWidthPx: number }
type ControllableStory = StoryObj<React.ComponentType<ControllableArgs>>


/** Top wallets, sortable columns, bare and card variants.
 * Fixed reference story — the Controls panel is inert here; use "Controllable" below to
 * drive props live. */
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

/**
 * Tiered column-count stress stories (10/50/100), per QA follow-up on #148.
 * Degradation strategy: columns are never hidden or truncated — every column
 * always renders in full. `DataTableScrollContainer` lets the inner row grow
 * to `width: 'max-content'` past the visible container, so excess columns
 * trigger horizontal scroll instead of squeezing every column unreadably
 * thin. This holds up fine through 100 columns since it's DOM breadth, not a
 * layout algorithm that degrades with count.
 *
 * These three set the `stretchWrapper` parameter (read by `withDefaultPreset`):
 * the default preset's wrapper shrinks to fit its own content under
 * `GoodWidgetProvider`'s centered layout, so DataTable's own scroll
 * container never receives a real width to overflow against. See
 * `withDefaultPreset`'s doc comment for the full mechanism.
 */
export const Stress10Columns: Story = {
  parameters: { stretchWrapper: true },
  render: () => (
    <DataTable data={manyColumns10.rows} columns={manyColumns10.columns} title="10 Columns" testID="DataTable-stress-10-columns" />
  ),
}

export const Stress50Columns: Story = {
  parameters: { stretchWrapper: true },
  render: () => (
    <DataTable data={manyColumns50.rows} columns={manyColumns50.columns} title="50 Columns" testID="DataTable-stress-50-columns" />
  ),
}

export const Stress100Columns: Story = {
  parameters: { stretchWrapper: true },
  render: () => (
    <DataTable data={manyColumns100.rows} columns={manyColumns100.columns} title="100 Columns" testID="DataTable-stress-100-columns" />
  ),
}

/**
 * 1200-row stress tier, per QA follow-up on #148. Degradation strategy:
 * `maxHeight` + `overflow: auto` + `stickyHeader` give vertical scroll with an
 * always-visible header, same mechanism as the 150-row `StressTest` above,
 * just exercised at a scale past 1000 rows.
 *
 * Known limitation (flagging rather than silently working around, per repo
 * convention): DataTable does not virtualize rows — every row is a real,
 * always-mounted DOM subtree, so all 1200 rows here render up front rather
 * than only the ~10 currently scrolled into view. That's an acceptable cost
 * at this scale (sort/scroll stay responsive in manual testing) but would
 * need row virtualization (e.g. windowing the row list to only what's within
 * `maxHeight` of the scroll position) before comfortably supporting
 * multi-thousand-row datasets — out of scope for this QA pass since it's a
 * structural rendering change, not a stress-dataset/documentation task.
 */
export const Stress1000Rows: Story = {
  render: () => (
    <DataTable data={manyRows} columns={stressColumns} title="All Wallets (1200 rows)" maxHeight={300} testID="DataTable-stress-1000-rows" />
  ),
}

/** Controllable instance — edit args in the Controls panel. `addressColumnWidthPx`
 * is the only way to reach `ColumnDef.width` interactively (see the comment above). */
export const Controllable: ControllableStory = {
  args: {
    data: wallets,
    columns: walletColumns,
    title: 'Top Wallets',
    variant: 'card',
    striped: true,
    compact: false,
    stickyHeader: true,
    addressColumnWidthPx: 160,
  },
  argTypes: {
    addressColumnWidthPx: {
      control: { type: 'range', min: 60, max: 400, step: 10 },
      description: 'Live-adjusts the "Address" column\'s width (ColumnDef.width) — the real prop is nested inside `columns` and has no control of its own.',
    },
  },
  render: ({ addressColumnWidthPx, columns, ...args }) => {
    const columnsWithControlledWidth = columns.map((column) =>
      column.key === 'address' ? { ...column, width: addressColumnWidthPx } : column,
    )
    return <DataTable {...args} columns={columnsWithControlledWidth} testID="DataTable-controllable" />
  },
}
