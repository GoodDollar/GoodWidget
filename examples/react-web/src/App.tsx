/**
 * App — root application shell for the GoodWidget demo lab.
 *
 * Architecture
 * ─────────────────────────────────────────────────────────────────────────────
 * The demo app is a React Router SPA.  All routes are client-side rendered
 * (Vite SPA mode — no SSR).  This file defines the router tree and wraps the
 * top-level layout in a single GoodWidgetProvider with no overrides so the
 * base preset is active by default for every page that does not supply its own
 * provider.
 *
 * Route map
 * ─────────────────────────────────────────────────────────────────────────────
 *   /                       → IndexPage (link grid to all routes)
 *   /components/:name       → ComponentDemoRoute (verified components only)
 *   /widget/claim           → ClaimWidgetPage
 *   /theme-overrides        → ThemeOverridesPage (the original OverrideShowcase)
 *
 * Only components from packages/ui/src/components/ (not components-test/) have
 * dedicated demo pages here.  Verified components: Card, GlowCard, Drawer, TokenAmount.
 *
 * Adding a new component route (verified components only)
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Create `src/pages/components/MyComponentPage.tsx`.
 * 2. Add an entry to the COMPONENT_PAGES map below.
 * 3. Add a link to IndexPage.tsx COMPONENT_ROUTES.
 */
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useParams } from 'react-router-dom'
import { GoodWidgetProvider } from '@goodwidget/core'
import { MiniAppShell, Text } from '@goodwidget/ui'

// ─── Route pages ─────────────────────────────────────────────────────────────
import { IndexPage } from './pages/IndexPage'
import { ThemeOverridesPage } from './pages/ThemeOverridesPage'
import { ClaimWidgetPage } from './pages/ClaimWidgetPage'

// Component demo pages — only verified components from packages/ui/src/components/
import { CardPage } from './pages/components/CardPage'
import { GlowCardPage } from './pages/components/GlowCardPage'
import { DrawerPage } from './pages/components/DrawerPage'
import { TokenAmountPage } from './pages/components/TokenAmountPage'

/**
 * Map from URL path segment to component demo page.
 * E.g. "/components/card" → CardPage.
 *
 * Only components from packages/ui/src/components/ are listed here.
 * Components still in packages/ui/src/components-test/ are not yet promoted
 * and do not have dedicated demo pages.
 */
const COMPONENT_PAGES: Record<string, React.ComponentType> = {
  card: CardPage,
  glowcard: GlowCardPage,
  drawer: DrawerPage,
  tokenamount: TokenAmountPage,
}

/**
 * ComponentDemoRoute — renders the correct demo page based on the `:name`
 * URL parameter.  Falls back to a 404-style message for unknown names.
 */
function ComponentDemoRoute({ name }: { name: string }) {
  const Page = COMPONENT_PAGES[name.toLowerCase()]
  if (!Page) {
    return (
      <MiniAppShell title="Not found">
        <Text>No demo page found for "{name}".</Text>
        <Link to="/">← Back to index</Link>
      </MiniAppShell>
    )
  }
  return <Page />
}

/**
 * App — the top-level component.
 *
 * A single root GoodWidgetProvider with no overrides wraps the router so that:
 *   - every route has access to a base Tamagui config and wallet context
 *   - routes that need wallet state (ClaimWidget) replace the provider with a
 *     mock-connected one scoped to that route alone
 */
export function App() {
  return (
    <GoodWidgetProvider defaultTheme="light">
      <BrowserRouter>
        <Routes>
          {/* ── Index ── */}
          <Route path="/" element={<IndexPage />} />

          {/* ── Per-component demos (verified components only) ── */}
          <Route
            path="/components/:name"
            element={<ComponentRouteWrapper />}
          />

          {/* ── Widget flows ── */}
          <Route path="/widget/claim" element={<ClaimWidgetPage />} />

          {/* ── Theme overrides (original OverrideShowcase) ── */}
          <Route path="/theme-overrides" element={<ThemeOverridesPage />} />

          {/* Catch-all: redirect unknown routes to index */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GoodWidgetProvider>
  )
}

/**
 * Thin wrapper that reads the :name param and delegates to ComponentDemoRoute.
 * Kept here to avoid adding react-router-dom as a dependency of individual
 * page components (they receive name as a plain prop).
 */
function ComponentRouteWrapper() {
  const { name = '' } = useParams<{ name: string }>()
  return <ComponentDemoRoute name={name} />
}

