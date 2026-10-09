/**
 * GoodDataWidget — top-level shell that owns dashboard registration/selection
 * and routing. Renders the single registered dashboard directly at the root
 * path when there is exactly one (the common case today), a picker linking
 * to each dashboard's stable subpath when there are several, and an explicit
 * "not found" page for any unmatched path — so direct navigation and page
 * refresh on a dashboard's own subpath always work. Does not wrap
 * TamaguiProvider itself; the host app supplies the theme provider, matching
 * every other GoodWidget package's convention.
 */
import React from 'react'
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom'
import { Heading, Text, YStack } from '@goodwidget/ui'
import { getDashboard, listDashboards } from './dashboards/registry'

const CONTENT_MAX_WIDTH = 1120

export interface GoodDataWidgetProps {
  /** Router basename, for when the host mounts this widget under a subpath rather than at the app root. */
  basename?: string
}

function UnknownDashboardPage({ dashboardId }: { dashboardId?: string }) {
  return (
    <YStack gap="$3" data-testid="unknown-dashboard">
      <Heading level={2} tag="h1">
        Dashboard not found
      </Heading>
      <Text tone="soft">
        {dashboardId
          ? `"${dashboardId}" isn't a registered dashboard.`
          : "This page doesn't match a registered dashboard."}
      </Text>
      <Link to="/">Back to dashboards</Link>
    </YStack>
  )
}

function DashboardSelector() {
  const dashboards = listDashboards()

  if (dashboards.length === 0) {
    return <Text tone="soft">No dashboards are registered.</Text>
  }

  // With exactly one dashboard registered, showing a picker just to click
  // through to the only option would be pointless friction — render it
  // directly, and it's still separately reachable at its own subpath.
  if (dashboards.length === 1) {
    const Dashboard = dashboards[0].component
    return <Dashboard />
  }

  return (
    <YStack gap="$4" data-testid="dashboard-selector">
      <Heading level={2} tag="h1">
        GoodData Dashboards
      </Heading>
      <YStack gap="$2">
        {dashboards.map((dashboard) => (
          <Link key={dashboard.id} to={`/${dashboard.path}`}>
            {dashboard.label}
          </Link>
        ))}
      </YStack>
    </YStack>
  )
}

function DashboardRoute() {
  const { dashboardId } = useParams<{ dashboardId: string }>()
  const dashboard = dashboardId ? getDashboard(dashboardId) : undefined

  if (!dashboard) {
    return <UnknownDashboardPage dashboardId={dashboardId} />
  }

  const Dashboard = dashboard.component
  return <Dashboard />
}

export function GoodDataWidget({ basename }: GoodDataWidgetProps = {}) {
  return (
    <YStack
      tag="main"
      width="100%"
      minHeight="100vh"
      backgroundColor="$background"
      alignItems="center"
      data-testid="gooddata-widget-page"
    >
      <YStack
        width="100%"
        maxWidth={CONTENT_MAX_WIDTH}
        paddingHorizontal="$6"
        paddingVertical="$8"
        $sm={{ paddingHorizontal: '$4', paddingVertical: '$6' }}
      >
        <BrowserRouter basename={basename}>
          <Routes>
            <Route path="/" element={<DashboardSelector />} />
            <Route path="/:dashboardId" element={<DashboardRoute />} />
            <Route path="*" element={<UnknownDashboardPage />} />
          </Routes>
        </BrowserRouter>
      </YStack>
    </YStack>
  )
}
