/**
 * IndexPage — the root index route ("/").
 *
 * Shows a link grid to all demo routes so reviewers and Playwright tests
 * have a single starting point to navigate the demo app.
 *
 * Route map:
 *   /                     — this page
 *   /components/:name     — per-primitive demo pages
 *   /widget/claim         — ClaimWidget full-flow demo
 *   /theme-overrides      — OverrideShowcase with 5 tabs
 */
import React from 'react'
import { Link } from 'react-router-dom'
import { MiniAppShell, Card, Heading, Text, YStack, XStack } from '@goodwidget/ui'

/** All demo routes exposed in the link grid. */
const COMPONENT_ROUTES: { name: string; path: string; walletMock?: boolean }[] = [
  { name: 'Button', path: '/components/button' },
  { name: 'Input', path: '/components/input' },
  { name: 'Alert', path: '/components/alert' },
  { name: 'Badge', path: '/components/badge' },
  { name: 'Spinner', path: '/components/spinner' },
  { name: 'Select', path: '/components/select' },
  { name: 'Checkbox', path: '/components/checkbox' },
  { name: 'Switch', path: '/components/switch' },
  { name: 'Separator', path: '/components/separator' },
  { name: 'Card', path: '/components/card' },
  { name: 'GlowCard', path: '/components/glowcard' },
  { name: 'Heading', path: '/components/heading' },
  { name: 'Text', path: '/components/text' },
  { name: 'WalletInfo', path: '/components/walletinfo', walletMock: true },
  { name: 'TokenAmount', path: '/components/tokenamount' },
  { name: 'AddressDisplay', path: '/components/addressdisplay', walletMock: true },
  { name: 'ChainBadge', path: '/components/chainbadge', walletMock: true },
  { name: 'Toast', path: '/components/toast' },
  { name: 'ActionSheet', path: '/components/actionsheet' },
  { name: 'Drawer', path: '/components/drawer' },
]

const WIDGET_ROUTES = [
  { name: 'ClaimWidget', path: '/widget/claim', walletMock: true },
  { name: 'Theme Overrides', path: '/theme-overrides' },
]

export function IndexPage() {
  return (
    <MiniAppShell title="GoodWidget Demo Lab">
      <Text secondary>
        A route-based demo environment for all GoodWidget components and widget flows. Routes marked
        🔌 use a wagmi mock connector to render wallet-aware components in a connected state.
      </Text>

      {/* ---------------------------------------------------------------- Widgets */}
      <Card>
        <Heading level={4}>Widget Flows</Heading>
        <YStack gap="$1">
          {WIDGET_ROUTES.map(({ name, path, walletMock }) => (
            <RouteLink key={path} name={name} path={path} walletMock={walletMock} />
          ))}
        </YStack>
      </Card>

      {/* ------------------------------------------------------ UI Primitives */}
      <Card>
        <Heading level={4}>UI Primitives</Heading>
        <YStack gap="$1">
          {COMPONENT_ROUTES.map(({ name, path, walletMock }) => (
            <RouteLink key={path} name={name} path={path} walletMock={walletMock} />
          ))}
        </YStack>
      </Card>
    </MiniAppShell>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper: a single link row styled inline using Tamagui base primitives.
// We keep this as a plain function rather than a named styled component because
// it has no design-system contract — it is purely local composition.
// ──────────────────────────────────────────────────────────────────────────────
function RouteLink({
  name,
  path,
  walletMock,
}: {
  name: string
  path: string
  walletMock?: boolean
}) {
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
        {walletMock && (
          <Text variant="caption" color="$primary">
            🔌 mock wallet
          </Text>
        )}
        <Text secondary>→</Text>
      </XStack>
    </Link>
  )
}
