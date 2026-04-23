/**
 * ClaimWidgetPage — full-flow demo for the ClaimWidget.
 *
 * Route: /widget/claim
 *
 * This page uses the mock EIP-1193 provider so the ClaimWidget renders in
 * a visibly "connected" state without requiring a real browser wallet.
 *
 * The page shows:
 *   1. Default ClaimWidget (preset baseline)
 *   2. ClaimWidget with a cobalt token override
 *   3. ClaimWidget with a teal host override
 *
 * All three instances are isolated at the GoodWidgetProvider boundary,
 * demonstrating per-instance widget theming.
 */
import React from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import { ClaimWidget } from '@goodwidget/claim-widget'
import {
  MiniAppShell,
  Card,
  Heading,
  Text,
  Alert,
  Badge,
  BadgeText,
  YStack,
} from '@goodwidget/ui'
import { createMockEip1193Provider, MOCK_ADDRESS, MOCK_CHAIN_ID } from '../mock/mockEip1193'

// Stable mock provider — created once so it does not trigger re-renders.
const mockProvider = createMockEip1193Provider()

/** Cobalt host override — matching the "Host" tab in ThemeOverridesPage. */
const cobaltOverrides = {
  tokens: {
    color: {
      primary: '#2E5DE8',
      primaryDark: '#1D3EB2',
      primaryLight: '#6E8DFF',
    },
  },
  themes: {
    light_ClaimCard: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.7)' },
    light_ClaimActionGlow: { primary: '#4F7DFF', primaryLight: '#9DB4FF' },
    light_ClaimActionRing: { primary: '#2E5DE8', primaryLight: '#6E8DFF' },
    light_ClaimActionInner: { backgroundDark: '#0E1A3A', backgroundDarkHover: '#172B60' },
    light_TokenAmountText: { color: '#BBD0FF', secondaryColor: '#7FA2FF' },
  },
}

/** Teal host override. */
const tealOverrides = {
  tokens: {
    color: {
      primary: '#00A884',
      primaryDark: '#007A61',
      primaryLight: '#33C9AA',
    },
  },
  themes: {
    light_ClaimCard: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.65)' },
    light_ClaimActionGlow: { primary: '#33C9AA', primaryLight: '#78E0CB' },
    light_ClaimActionRing: { primary: '#00A884', primaryLight: '#33C9AA' },
    light_ClaimActionInner: { backgroundDark: '#062A23', backgroundDarkHover: '#0B3B31' },
    light_TokenAmountText: { color: '#BFF5E7', secondaryColor: '#66D5BB' },
  },
}

export function ClaimWidgetPage() {
  return (
    /*
     * Outer provider: supplies the mock wallet and base theme for the page shell.
     * Each ClaimWidget below wraps its own GoodWidgetProvider at its boundary
     * (that is the ClaimWidget contract — see packages/claim-widget/src/ClaimWidget.tsx).
     */
    <GoodWidgetProvider provider={mockProvider} defaultTheme="light">
      <MiniAppShell title="ClaimWidget Demo">
        <Alert
          type="info"
          title="Mock wallet connected"
          message={`Demo uses stable mock address ${MOCK_ADDRESS.slice(0, 8)}… on chain ${MOCK_CHAIN_ID} (Celo).`}
        />

        {/* ---------------------------------------------------------------- Default */}
        <Card>
          <Heading level={4}>Default Preset</Heading>
          <Text secondary>
            No runtime overrides — the GoodWalletV2 preset drives all tokens and themes.
          </Text>
          {/* data-testid used by Playwright smoke test */}
          <YStack data-testid="ClaimWidget-default">
            <ClaimWidget provider={mockProvider} />
          </YStack>
        </Card>

        {/* ---------------------------------------------------------------- Cobalt */}
        <Card borderColor="#2E5DE8" borderWidth={2}>
          <Heading level={4} color="#2E5DE8">
            Cobalt Host Override
          </Heading>
          <Text secondary>Token + component theme overrides applied via `themeOverrides`.</Text>
          <YStack data-testid="ClaimWidget-cobalt">
            <ClaimWidget provider={mockProvider} themeOverrides={cobaltOverrides} />
          </YStack>
        </Card>

        {/* ----------------------------------------------------------------- Teal */}
        <Card borderColor="#00A884" borderWidth={2}>
          <Heading level={4} color="#00A884">
            Teal Host Override
          </Heading>
          <Text secondary>Demonstrates per-instance isolation — each widget has its own branding.</Text>
          <YStack data-testid="ClaimWidget-teal">
            <ClaimWidget provider={mockProvider} themeOverrides={tealOverrides} />
          </YStack>
        </Card>

        {/* ----------------------------------------------------------------- Info */}
        <Card>
          <Heading level={5}>Instance isolation</Heading>
          <Text secondary>
            All three ClaimWidget instances above are isolated at the GoodWidgetProvider boundary.
            Each computes its own Tamagui config from the effective token + theme set.
          </Text>
          <Badge type="info" style={{ alignSelf: 'flex-start' }}>
            <BadgeText>See /theme-overrides for a tabbed walkthrough</BadgeText>
          </Badge>
        </Card>
      </MiniAppShell>
    </GoodWidgetProvider>
  )
}
