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
 * Pages that need wallet state (WalletInfo, AddressDisplay, ChainBadge,
 * ClaimWidget) create a nested GoodWidgetProvider with a mock EIP-1193
 * provider so they render in a "connected" state without a real browser wallet.
 * That mock is scoped to the page — it does not affect other routes.
 *
 * Route map
 * ─────────────────────────────────────────────────────────────────────────────
 *   /                       → IndexPage (link grid to all routes)
 *   /components/:name       → ComponentDemoRoute (per-primitive pages)
 *   /widget/claim           → ClaimWidgetPage
 *   /theme-overrides        → ThemeOverridesPage (the original OverrideShowcase)
 *
 * Adding a new component route
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Create `src/pages/components/MyComponentPage.tsx`.
 * 2. Add an entry to the COMPONENT_PAGES map below.
 * 3. Add a link to IndexPage.tsx if it should appear in the link grid.
 */
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useParams } from 'react-router-dom'
import { GoodWidgetProvider } from '@goodwidget/core'
import { MiniAppShell, Text } from '@goodwidget/ui'

// ─── Route pages ─────────────────────────────────────────────────────────────
import { IndexPage } from './pages/IndexPage'
import { ThemeOverridesPage } from './pages/ThemeOverridesPage'
import { ClaimWidgetPage } from './pages/ClaimWidgetPage'

// Component demo pages
import { ButtonPage } from './pages/components/ButtonPage'
import { InputPage } from './pages/components/InputPage'
import { AlertPage } from './pages/components/AlertPage'
import { BadgePage } from './pages/components/BadgePage'
import { SpinnerPage } from './pages/components/SpinnerPage'
import { SelectPage } from './pages/components/SelectPage'
import { CheckboxPage } from './pages/components/CheckboxPage'
import { SwitchPage } from './pages/components/SwitchPage'
import { SeparatorPage } from './pages/components/SeparatorPage'
import { CardPage } from './pages/components/CardPage'
import { GlowCardPage } from './pages/components/GlowCardPage'
import { HeadingPage } from './pages/components/HeadingPage'
import { TextPage } from './pages/components/TextPage'
import { WalletInfoPage } from './pages/components/WalletInfoPage'
import { TokenAmountPage } from './pages/components/TokenAmountPage'
import { AddressDisplayPage } from './pages/components/AddressDisplayPage'
import { ChainBadgePage } from './pages/components/ChainBadgePage'
import { ToastPage } from './pages/components/ToastPage'
import { ActionSheetPage } from './pages/components/ActionSheetPage'
import { DrawerPage } from './pages/components/DrawerPage'

/**
 * Map from URL path segment to component page.
 * E.g. "/components/button" → ButtonPage.
 *
 * Wallet-aware pages handle their own mock provider internally.
 */
const COMPONENT_PAGES: Record<string, React.ComponentType> = {
  button: ButtonPage,
  input: InputPage,
  alert: AlertPage,
  badge: BadgePage,
  spinner: SpinnerPage,
  select: SelectPage,
  checkbox: CheckboxPage,
  switch: SwitchPage,
  separator: SeparatorPage,
  card: CardPage,
  glowcard: GlowCardPage,
  heading: HeadingPage,
  text: TextPage,
  walletinfo: WalletInfoPage,
  tokenamount: TokenAmountPage,
  addressdisplay: AddressDisplayPage,
  chainbadge: ChainBadgePage,
  toast: ToastPage,
  actionsheet: ActionSheetPage,
  drawer: DrawerPage,
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
 *   - routes that need wallet state replace the provider with a mock-connected
 *     one scoped to that route alone
 */
export function App() {
  return (
    <GoodWidgetProvider defaultTheme="light">
      <BrowserRouter>
        <Routes>
          {/* ── Index ── */}
          <Route path="/" element={<IndexPage />} />

          {/* ── Per-component demos ── */}
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

