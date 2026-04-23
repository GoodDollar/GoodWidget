/**
 * IndexPage — the root index route ("/").
 *
 * Shows a link grid to all demo routes so reviewers and Playwright tests
 * have a single starting point to navigate the demo app.
 *
 * Route map:
 *   /                     — this page
 *   /components/:name     — per-component demo pages (verified components only)
 *   /widget/claim         — ClaimWidget full-flow demo
 *   /theme-overrides      — OverrideShowcase with 5 tabs
 *
 * Only components from packages/ui/src/components/ (not components-test/) are
 * listed here.  Components in components-test/ are not yet promoted and do not
 * have dedicated demo pages.
 */
import React from 'react'
import { Link } from 'react-router-dom'
import { MiniAppShell, Card, Heading, Text, YStack, XStack } from '@goodwidget/ui'

/**
 * Verified component demo routes — only components from packages/ui/src/components/.
 * Card, GlowCard, Drawer, TokenAmount are the currently verified primitives.
 */
const COMPONENT_ROUTES: { name: string; path: string }[] = [
  { name: 'Card', path: '/components/card' },
  { name: 'GlowCard', path: '/components/glowcard' },
  { name: 'Drawer', path: '/components/drawer' },
  { name: 'TokenAmount', path: '/components/tokenamount' },
]

const WIDGET_ROUTES = [
  { name: 'ClaimWidget', path: '/widget/claim' },
  { name: 'Theme Overrides', path: '/theme-overrides' },
]

export function IndexPage() {
  return (
    <MiniAppShell title="GoodWidget Demo Lab">
      <Text secondary>
        A route-based demo environment for verified GoodWidget components and widget flows.
        Component demos are limited to components promoted to{' '}
        <Text bold>packages/ui/src/components/</Text>.
      </Text>

      {/* ---------------------------------------------------------------- Widgets */}
      <Card>
        <Heading level={4}>Widget Flows</Heading>
        <YStack gap="$1">
          {WIDGET_ROUTES.map(({ name, path }) => (
            <RouteLink key={path} name={name} path={path} />
          ))}
        </YStack>
      </Card>

      {/* ------------------------------------------------------ Verified UI Primitives */}
      <Card>
        <Heading level={4}>UI Primitives (verified)</Heading>
        <YStack gap="$1">
          {COMPONENT_ROUTES.map(({ name, path }) => (
            <RouteLink key={path} name={name} path={path} />
          ))}
        </YStack>
      </Card>
    </MiniAppShell>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper: a single link row styled inline using Tamagui base primitives.
// ──────────────────────────────────────────────────────────────────────────────
function RouteLink({ name, path }: { name: string; path: string }) {
  return (
    // data-testid lets Playwright navigate to each route by a stable selector
    <Link to={path} style={{ textDecoration: 'none' }} data-testid={`nav-${name.replace(/\s+/g, '')}`}>
      <XStack
        padding="$2"
        borderRadius="$2"
        gap="$2"
        alignItems="center"
        hoverStyle={{ backgroundColor: '$backgroundHover' }}
      >
        <Text bold style={{ flex: 1 }}>
          {name}
        </Text>
        <Text secondary>→</Text>
      </XStack>
    </Link>
  )
}
