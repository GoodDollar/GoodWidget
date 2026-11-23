/**
 * BuildersS5Dashboard — the GoodBuilders season 5 page. Shows the latest stored gbmetrics report, one card per
 * metric: a plain explanation, a "Keep in mind" note, and a bar for each team (TeamBars). This first version uses
 * only what @goodwidget/ui has today (one bar color, no carousel, no history lines); card rules live in model.ts,
 * card text in metrics.ts, and loading in useBuildersS5Data.ts. Page-level chrome (width, background) comes from
 * GoodDataWidget.
 */
import React from 'react'
import { Button, ButtonText, Heading, SkeletonBlock, Text, YStack } from '@goodwidget/ui'
import type { BuildersReport } from './connector'
import { buildCardModel, formatBarLabel, reportHeadline } from './model'
import { METRIC_SECTIONS, type MetricDefinition } from './metrics'
import { TeamBars } from './TeamBars'
import { useBuildersS5Data, type BuildersS5LoadState } from './useBuildersS5Data'

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
}: {
  metric: MetricDefinition
  report: BuildersReport
  firstReportDate: string | null
}) {
  const model = buildCardModel(metric, report, firstReportDate)
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
          <TeamBars
            rows={model.rows}
            formatValue={(value) => formatBarLabel(value, metric.unit)}
            testID={`metric-chart-${metric.key}`}
          />
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
          {METRIC_SECTIONS.map((section) => (
            <YStack key={section.id} gap="$4" data-testid={`builders-section-${section.id}`}>
              <Heading level={3} tag="h2">
                {section.title}
              </Heading>
              {section.note ? <Text tone="soft">{section.note}</Text> : null}
              {section.metrics.map((metric) => (
                <MetricCard key={metric.key} metric={metric} report={report} firstReportDate={state.data.firstReportDate} />
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
