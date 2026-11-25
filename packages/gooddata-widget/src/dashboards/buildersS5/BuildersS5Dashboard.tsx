/** Builders Season 5 dashboard, using stored reports and the shared analytics components. */
import React from 'react'
import { BarChart, Button, ButtonText, Carousel, Heading, LineAreaChart, Scorecard, ScorecardGrid, SkeletonBlock, Text, YStack } from '@goodwidget/ui'
import type { BuildersReport } from './connector'
import { buildCardModel, formatBarLabel, formatExact, reportHeadline } from './model'
import { METRIC_SECTIONS, type MetricDefinition } from './metrics'
import { useBuildersS5Data, type BuildersS5LoadState } from './useBuildersS5Data'

// The approved preview uses stable team colors; unknown teams get a deterministic fallback.
const TEAM_COLORS: Record<string, string> = {
  'Good drops': '#5288cd', UbeGames: '#ab5637', 'ACTION-ORDER': '#3eac80',
  Blockslide: '#be8531', Onward: '#ac5370', Valor: '#347430', Delulu: '#9089db',
}
const FALLBACK_COLORS = Object.values(TEAM_COLORS)
function teamColor(team: string): string {
  const hash = Array.from(team).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0)
  return TEAM_COLORS[team] ?? FALLBACK_COLORS[hash % FALLBACK_COLORS.length]
}

function MessageBox({ title, body, testID, children }: { title: string; body?: string; testID: string; children?: React.ReactNode }) {
  return (
    <YStack
      gap="$3"
      alignItems="center"
      padding="$6"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius="$3"
      data-testid={testID}
    >
      <Heading level={4} tag="h2">
        {title}
      </Heading>
      {body ? (
        <Text tone="soft" center>
          {body}
        </Text>
      ) : null}
      {children}
    </YStack>
  )
}

function LoadingSkeleton() {
  return (
    <YStack gap="$6" width="100%" data-testid="builders-loading-skeleton">
      {[0, 1, 2].map((index) => (
        <SkeletonBlock key={index} height={260} />
      ))}
    </YStack>
  )
}

function MetricCard({
  metric,
  report,
  firstReportDate,
  history,
}: {
  metric: MetricDefinition
  report: BuildersReport
  firstReportDate: string | null
  history: BuildersReport[]
}) {
  const model = buildCardModel(metric, report, firstReportDate)
  const previous = history[history.length - 1]
  const reports = [...history, report]
  const teams = [...new Set(reports.flatMap((item) => item.teams.map((team) => team.name)))]
  const historyData = reports.flatMap((item) => teams.map((team) => ({
    x: item.date,
    y: item.teams.find((entry) => entry.name === team)?.results[metric.key] ?? null,
    series: team,
  })))
  const hasHistory = history.length > 0 && historyData.some((point) => point.x !== report.date && point.y !== null)
  return (
    <YStack
      gap="$3"
      padding="$5"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius="$3"
      data-testid={`metric-card-${metric.key}`}
    >
      <Heading level={4} tag="h3">
        {metric.name}
      </Heading>
      <Text tone="soft">{metric.what}</Text>
      {metric.mind ? (
        <Text tone="soft">
          <Text tone="soft" fontWeight="700">
            Keep in mind:
          </Text>{' '}
          {metric.mind}
        </Text>
      ) : null}
      {model.kind === 'placeholder' ? (
        <YStack
          minHeight={96}
          alignItems="center"
          justifyContent="center"
          padding="$4"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$2"
          data-testid={`metric-placeholder-${metric.key}`}
        >
          <Text tone="soft" center>
            {model.text}
          </Text>
        </YStack>
      ) : (
        <>
          <Text variant="caption" tone="soft">
            {model.periodLabel}
          </Text>
          <Carousel
            slideLabels={['Each team', 'Teams compared', ...(hasHistory ? ['Over time'] : [])]}
            testID={`metric-carousel-${metric.key}`}
          >
            <ScorecardGrid>
              {model.rows.map((row) => {
                const prior = previous?.teams.find((team) => team.name === row.team)?.results[metric.key]
                const difference = typeof prior === 'number' ? row.value - prior : null
                const trend = difference === null ? undefined : {
                  value: Math.abs(difference),
                  direction: difference > 0 ? 'up' as const : difference < 0 ? 'down' as const : 'neutral' as const,
                }
                const change = difference === null ? undefined : difference === 0 ? 'No change' :
                  `${difference > 0 ? '+' : '-'}${metric.unit === 'pct' ? `${(Math.abs(difference) * 100).toFixed(1)} pp` : formatBarLabel(Math.abs(difference), metric.unit)}`
                return (
                  <Scorecard key={row.team} label={row.team} value={row.value} variant="tile"
                    accentColor={teamColor(row.team)} valueFormatter={(value) => formatBarLabel(value, metric.unit)}
                    trend={trend} trendText={change} trendLabel={previous ? `since ${previous.date}` : undefined}
                    tooltip={{ header: row.team, subheader: metric.short, rows: [{ label: metric.short, value: formatExact(row.value, metric.unit), color: teamColor(row.team) }], rightAlignValues: true, swatchShape: 'square' }}
                    testID={`metric-tile-${metric.key}-${row.team}`} />
                )
              })}
            </ScorecardGrid>
            <BarChart
              data={model.rows.map((row) => ({ category: row.team, value: row.value, color: teamColor(row.team) }))}
              layout="horizontal" labelColumns showValueAxis={false} showGrid={false} alwaysShowValueLabels
              valueFormatter={(value) => formatBarLabel(value, metric.unit)}
              tooltip={{ label: metric.short, valueFormatter: (value) => formatExact(value, metric.unit), rightAlignValues: true }}
              swatchShape="square" testID={`metric-chart-${metric.key}`}
            />
            {hasHistory ? (
              <LineAreaChart data={historyData} series={teams.map((team) => ({ key: team, label: team, color: teamColor(team) }))}
                yAxisFormatter={(value) => formatBarLabel(value, metric.unit)}
                tooltip={{ label: metric.short, valueFormatter: (value) => formatExact(value, metric.unit), xFormatter: (x) => `Report of ${x}`, sort: 'desc', rightAlignValues: true }}
                legendPosition="top" swatchShape="square" focusPointOnHover testID={`metric-history-${metric.key}`} />
            ) : null}
          </Carousel>
          {model.exactNote ? (
            <Text variant="caption" tone="soft" data-testid={`metric-exact-${metric.key}`}>
              {model.exactNote}
            </Text>
          ) : null}
          {model.missingNote ? (
            <Text variant="caption" tone="soft" data-testid={`metric-missing-${metric.key}`}>
              {model.missingNote}
            </Text>
          ) : null}
        </>
      )}
    </YStack>
  )
}

export interface BuildersS5DashboardViewProps {
  state: BuildersS5LoadState
  onRetry: () => void
}

/** Pure view: takes the resolved load state, so it renders identically from the live hook or from a fixed fixture. */
export function BuildersS5DashboardView({ state, onRetry }: BuildersS5DashboardViewProps) {
  const report = state.status === 'ready' ? state.data.report : null
  return (
    <YStack gap="$6" width="100%" data-testid="builders-s5-dashboard">
      <YStack gap="$2">
        <Heading level={2} tag="h1">
          Builders Season 5
        </Heading>
        {state.status === 'ready' && report ? (
          <Text tone="soft" data-testid="builders-headline">
            {reportHeadline(report.date, state.data.firstReportDate)}
          </Text>
        ) : null}
        <Text variant="caption" tone="soft">
          A new report comes out every Sunday. Weeks run Sunday to Saturday, UTC.
        </Text>
      </YStack>

      {state.status === 'loading' ? <LoadingSkeleton /> : null}

      {state.status === 'error' ? (
        <MessageBox
          testID="builders-unavailable"
          title="The builders report is unavailable right now"
          body="We couldn't reach the weekly report. Nothing is shown rather than old or made-up numbers."
        >
          <Button size="sm" variant="outline" onPress={onRetry} data-testid="builders-retry">
            <ButtonText>Try again</ButtonText>
          </Button>
        </MessageBox>
      ) : null}

      {state.status === 'ready' && !report ? <MessageBox testID="builders-no-report" title="No report yet." /> : null}

      {state.status === 'ready' && report ? (
        <>
          {report.status === 'partial' ? (
            <YStack
              borderWidth={1}
              borderColor="$borderColorFocus"
              borderRadius="$3"
              paddingHorizontal="$4"
              paddingVertical="$3"
              backgroundColor="$infoMuted"
              data-testid="builders-partial-banner"
            >
              <Text variant="label" tone="default">
                This report finished with errors; some numbers may be missing.
              </Text>
            </YStack>
          ) : null}
          {state.data.historyIncomplete ? <Text tone="soft" data-testid="builders-history-incomplete">Some older reports could not be loaded; history may be incomplete.</Text> : null}
          {METRIC_SECTIONS.map((section) => (
            <YStack key={section.id} gap="$4" data-testid={`builders-section-${section.id}`}>
              <Heading level={3} tag="h2">
                {section.title}
              </Heading>
              {section.note ? <Text tone="soft">{section.note}</Text> : null}
              {section.metrics.map((metric) => (
                <MetricCard key={metric.key} metric={metric} report={report} firstReportDate={state.data.firstReportDate} history={state.data.history ?? []} />
              ))}
            </YStack>
          ))}
        </>
      ) : null}
    </YStack>
  )
}

export interface BuildersS5DashboardProps {
  /** Renders a fixed state instead of loading from gbmetrics — for Storybook and screenshots only. */
  mockState?: BuildersS5LoadState
}

function BuildersS5DashboardLive() {
  const { state, retry } = useBuildersS5Data()
  return <BuildersS5DashboardView state={state} onRetry={retry} />
}

export function BuildersS5Dashboard({ mockState }: BuildersS5DashboardProps = {}) {
  if (mockState) return <BuildersS5DashboardView state={mockState} onRetry={() => undefined} />
  return <BuildersS5DashboardLive />
}
