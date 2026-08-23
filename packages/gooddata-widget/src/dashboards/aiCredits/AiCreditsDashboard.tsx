/**
 * AiCreditsDashboard — AntSeed AI Credits analytics dashboard content. Ported
 * from GoodDollar/data-team's reference dashboard
 * (projects/antseed-analytics/dashboard/app.js), which renders the same 3
 * scorecards + 3 charts + paginated table via vanilla JS/Chart.js/DOM, using
 * @goodwidget/ui's chart components instead. Page-level chrome (max-width
 * container, background) lives in GoodDataWidget — this component owns only
 * the dashboard's own content.
 */
import React from 'react'
import {
  BarChart,
  Button,
  ButtonText,
  Heading,
  LineAreaChart,
  Scorecard,
  Text,
  XStack,
  YStack,
} from '@goodwidget/ui'
import type { DataTableColumnDef } from '@goodwidget/ui'
import { flowRateToDaily, weiToGd, weiToUsd } from './analyticsConversions'
import type { DailyAnalyticsRecord } from './connector'
import { useAiCreditsDashboardData, type AnalyticsDataSource } from './useAiCreditsDashboardData'
import { buildMockViewProps, type AiCreditsDashboardMockState, type AiCreditsDashboardViewProps } from './mockState'
import { DataSourceToggle } from './components/DataSourceToggle'
import { PaginatedDataTable } from './components/PaginatedDataTable'

/** One row of the daily summary table, pre-computed from a DailyAnalyticsRecord so DataTable's columns can render plain numbers/strings without re-deriving them per cell. */
interface TableRow extends Record<string, unknown> {
  date: string
  gdDeposited: number
  gdStreamed: number
  totalGd: number
  aiCreditsUsd: number
  walletsGd: number
  walletsAi: number
}

const TABLE_COLUMNS: Array<DataTableColumnDef<TableRow>> = [
  { key: 'date', label: 'Date', type: 'text', align: 'left', sortable: true },
  { key: 'gdDeposited', label: 'G$ Deposited', type: 'number', sortable: true },
  { key: 'gdStreamed', label: 'G$ Streamed', type: 'number', sortable: true },
  { key: 'totalGd', label: 'Total G$', type: 'number', sortable: true },
  { key: 'aiCreditsUsd', label: 'AI Credits (USD)', type: 'currency', formatter: (value) => `$${(value as number).toFixed(2)}`, sortable: true },
  { key: 'walletsGd', label: 'Wallets (G$)', type: 'number', sortable: true },
  { key: 'walletsAi', label: 'Wallets (AI)', type: 'number', sortable: true },
]

/** Removes any daily record the Worker has flagged as incomplete — the spec requires these excluded from every chart and the table, not just displayed as zero. */
function filterCompleteRecords(daily: DailyAnalyticsRecord[]): DailyAnalyticsRecord[] {
  return daily.filter((record) => !record.missing)
}

function toTableRow(record: DailyAnalyticsRecord): TableRow {
  const gdDeposited = weiToGd(record.gdOneTimeDepositsWei)
  const gdStreamed = weiToGd(record.gdStreamedWei)
  return {
    date: record.date,
    gdDeposited,
    gdStreamed,
    totalGd: gdDeposited + gdStreamed,
    aiCreditsUsd: weiToUsd(record.aiCreditsUsedWei),
    walletsGd: record.uniqueGdBuyers,
    walletsAi: record.uniqueCreditUsers,
  }
}

/** Shared empty/unavailable placeholder for chart and table sections — visually distinct from the top-level loading spinner, since it represents "loaded but nothing to show" or "can't reach live data", not "still fetching". */
function SectionPlaceholder({ message }: { message: string }) {
  return (
    <YStack
      minHeight={160}
      alignItems="center"
      justifyContent="center"
      padding="$5"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius="$3"
      data-testid="section-placeholder"
    >
      <Text tone="soft" center>
        {message}
      </Text>
    </YStack>
  )
}

function DashboardHeader({
  source,
  onSelectSource,
  isRefreshing,
  onRefresh,
  lastUpdatedAt,
}: {
  source: AnalyticsDataSource
  onSelectSource: (source: AnalyticsDataSource) => void
  isRefreshing: boolean
  onRefresh: () => void
  lastUpdatedAt: string | null
}) {
  return (
    <YStack gap="$4" width="100%">
      <XStack justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap="$4">
        <YStack gap="$1">
          <Heading level={2} tag="h1">
            AI Credits Analytics
          </Heading>
          <Text tone="soft">AntSeed G$ volume, credit usage, and unique wallets.</Text>
        </YStack>
        <XStack gap="$3" alignItems="center" flexWrap="wrap">
          <DataSourceToggle source={source} onSelect={onSelectSource} />
          <Button size="sm" variant="outline" disabled={isRefreshing} onPress={onRefresh} data-testid="refresh-button">
            <ButtonText>{isRefreshing ? 'Refreshing…' : 'Refresh'}</ButtonText>
          </Button>
        </XStack>
      </XStack>

      {source === 'demo' ? (
        <XStack
          borderWidth={1}
          borderColor="$borderColorFocus"
          borderRadius="$3"
          paddingHorizontal="$4"
          paddingVertical="$3"
          backgroundColor="$infoMuted"
          data-testid="demo-banner"
        >
          <Text variant="label" color="$primaryLight">
            Showing demo data. Live AntSeed analytics were unavailable at load time, or you selected
            Demo manually.
          </Text>
        </XStack>
      ) : null}

      <Text variant="caption" tone="dim" data-testid="last-updated-text">
        {lastUpdatedAt ? `Last aggregation: ${lastUpdatedAt} · Auto-refreshes every 5 min` : 'Loading last aggregation time…'}
      </Text>
    </YStack>
  )
}

/** Pure presentational view — takes fully-resolved state as props so it renders identically whether driven by the live hook or a static QA/Storybook fixture. */
function AiCreditsDashboardView({
  data,
  source,
  isInitialLoadComplete,
  isRefreshing,
  isLiveUnavailable,
  onSelectSource,
  onRefresh,
}: AiCreditsDashboardViewProps) {
  if (!isInitialLoadComplete) {
    return (
      <YStack minHeight={240} alignItems="center" justifyContent="center">
        <Text tone="soft">Loading analytics…</Text>
      </YStack>
    )
  }

  const lastUpdatedAt = data?.lastRun.updatedAt ? new Date(data.lastRun.updatedAt).toLocaleString() : null

  const dailyRecords = data ? filterCompleteRecords(data.daily) : []
  const hasDailyData = dailyRecords.length > 0

  // Scorecards derive straight from `global`, matching the reference dashboard's renderHero().
  const totalGdSpent = data ? weiToGd(data.global.gdOneTimeDepositsWei) + weiToGd(data.global.gdStreamedWei) : 0
  const aiCreditsUsedUsd = data ? weiToUsd(data.global.aiCreditsUsedWei) : 0
  const gdFlowRatePerDay = data ? flowRateToDaily(data.global.gdTotalFlowRateWeiPerSecond) : 0

  const volumeChartData = dailyRecords.flatMap((record) => [
    { x: record.date, y: weiToGd(record.gdOneTimeDepositsWei), series: 'deposits' },
    { x: record.date, y: weiToGd(record.gdStreamedWei), series: 'streamed' },
  ])

  const creditsChartData = dailyRecords.map((record) => ({
    category: record.date,
    value: weiToUsd(record.aiCreditsUsedWei),
  }))

  const walletsChartData = dailyRecords.flatMap((record) => [
    { x: record.date, y: record.uniqueGdBuyers, series: 'gdBuyers' },
    { x: record.date, y: record.uniqueCreditUsers, series: 'creditUsers' },
  ])

  // Most-recent-first, per the reference dashboard's renderTable() sort.
  const tableRows = [...dailyRecords].sort((a, b) => b.date.localeCompare(a.date)).map(toTableRow)

  return (
    <YStack gap="$8" width="100%">
      <DashboardHeader
        source={source}
        onSelectSource={onSelectSource}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
        lastUpdatedAt={lastUpdatedAt}
      />

      <XStack gap="$4" flexWrap="wrap" data-testid="scorecards-row">
        <Scorecard
          variant="card"
          value={totalGdSpent}
          label="Total G$ Spent"
          prefix="G$"
          format="decimal"
          testID="scorecard-total-gd"
        />
        <Scorecard
          variant="card"
          value={aiCreditsUsedUsd}
          label="AI Credits Used"
          prefix="USD"
          format="decimal"
          testID="scorecard-ai-credits"
        />
        <Scorecard
          variant="card"
          value={gdFlowRatePerDay}
          label="G$ Flow Rate"
          prefix="G$"
          suffix="/day"
          format="decimal"
          testID="scorecard-flow-rate"
        />
      </XStack>

      <YStack gap="$6" width="100%" data-testid="charts-section">
        {isLiveUnavailable ? (
          <SectionPlaceholder message="Live endpoint not yet deployed. Charts will populate automatically once it's available — this view auto-retries every 5 minutes." />
        ) : !hasDailyData ? (
          <SectionPlaceholder message="No daily data yet. Charts will appear once activity starts." />
        ) : (
          <>
            <LineAreaChart
              variant="card"
              title="G$ Volume"
              data={volumeChartData}
              series={[
                { key: 'deposits', label: 'One-time Deposits (G$)' },
                { key: 'streamed', label: 'Streamed (G$)' },
              ]}
              showArea
              // G$ volume is never negative — pin the axis floor at 0 instead of letting
              // the shared chart's default 10%-padding dip below zero.
              yAxisDomain={[0, 'auto']}
              testID="chart-gd-volume"
            />
            <BarChart variant="card" title="AI Credits Used (USD)" data={creditsChartData} testID="chart-ai-credits" />
            <LineAreaChart
              variant="card"
              title="Unique Wallets"
              data={walletsChartData}
              series={[
                { key: 'gdBuyers', label: 'G$ Buyers' },
                { key: 'creditUsers', label: 'Credit Users' },
              ]}
              showArea={false}
              testID="chart-unique-wallets"
            />
          </>
        )}
      </YStack>

      <YStack gap="$4" width="100%" data-testid="table-section">
        <Heading level={4} tag="h2">
          Daily Summary
        </Heading>
        {isLiveUnavailable ? (
          <SectionPlaceholder message="Live endpoint not yet deployed. The daily summary table will populate automatically once it's available." />
        ) : (
          <PaginatedDataTable
            data={tableRows}
            columns={TABLE_COLUMNS}
            emptyMessage="No data recorded yet. The table will populate once transactions occur."
            testID="daily-summary"
          />
        )}
      </YStack>
    </YStack>
  )
}

/** Data-connected wrapper: wires the real hook (network + timers) to the presentational view. */
function AiCreditsDashboardLive() {
  const { data, source, isInitialLoadComplete, isRefreshing, isLiveUnavailable, switchSource, refresh } =
    useAiCreditsDashboardData()

  return (
    <AiCreditsDashboardView
      data={data}
      source={source}
      isInitialLoadComplete={isInitialLoadComplete}
      isRefreshing={isRefreshing}
      isLiveUnavailable={isLiveUnavailable}
      onSelectSource={switchSource}
      onRefresh={() => void refresh()}
    />
  )
}

export interface AiCreditsDashboardProps {
  /** Renders a static fixture instead of the live hook — for Storybook QA stories and screenshot baselines only. */
  mockState?: AiCreditsDashboardMockState
}

export function AiCreditsDashboard({ mockState }: AiCreditsDashboardProps = {}) {
  if (mockState) {
    return <AiCreditsDashboardView {...buildMockViewProps(mockState)} onSelectSource={() => undefined} onRefresh={() => undefined} />
  }
  return <AiCreditsDashboardLive />
}
