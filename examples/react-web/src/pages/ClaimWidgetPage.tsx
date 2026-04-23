/**
 * ClaimWidgetPage — full-flow demo for the ClaimWidget.
 *
 * Route: /widget/claim
 *
 * This page uses the mock EIP-1193 provider so the ClaimWidget renders in
 * a visibly "connected" state without requiring a real browser wallet.
 *
 * Each tab renders exactly one ClaimWidget at a time to avoid Tamagui theme
 * clashing that occurs when multiple GoodWidgetProviders with different
 * themeOverrides are mounted simultaneously on the same page.
 *
 * Tabs:
 *   Default  — no overrides, preset baseline
 *   Cobalt   — cobalt brand themeOverrides
 *   Teal     — teal brand themeOverrides
 */
import React, { useState } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import { ClaimWidget } from '@goodwidget/claim-widget'
import {
  MiniAppShell,
  Card,
  Heading,
  Text,
  Alert,
  Button,
  ButtonText,
  Badge,
  BadgeText,
  XStack,
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

type TabKey = 'default' | 'cobalt' | 'teal'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'cobalt', label: 'Cobalt' },
  { key: 'teal', label: 'Teal' },
]

export function ClaimWidgetPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('default')

  return (
    /*
     * Outer provider: supplies the mock wallet and base theme for the page shell.
     * The active-tab ClaimWidget mounts its own inner GoodWidgetProvider, so only
     * one set of themeOverrides is active in the tree at any time — this avoids
     * Tamagui theme clashing when multiple providers share the same page.
     */
    <GoodWidgetProvider provider={mockProvider} defaultTheme="light">
      <MiniAppShell title="ClaimWidget Demo">
        <Alert
          type="info"
          title="Mock wallet connected"
          message={`Demo uses stable mock address ${MOCK_ADDRESS.slice(0, 8)}… on chain ${MOCK_CHAIN_ID} (Celo).`}
        />

        {/* Tab bar — data-testid attributes for Playwright navigation */}
        <XStack gap="$1" flexWrap="wrap">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={activeTab === tab.key ? 'primary' : 'secondary'}
              onPress={() => setActiveTab(tab.key)}
              data-testid={`tab-${tab.key}`}
            >
              <ButtonText color={activeTab === tab.key ? 'white' : 'grey'}>
                {tab.label}
              </ButtonText>
            </Button>
          ))}
        </XStack>

        {/* ---------------------------------------------------------------- Default */}
        {activeTab === 'default' && (
          <YStack gap="$4">
            <Card>
              <Heading level={4}>Default Preset</Heading>
              <Text secondary>
                No runtime overrides — the GoodWalletV2 preset drives all tokens and themes.
              </Text>
            </Card>
            {/* data-testid used by Playwright smoke test */}
            <YStack data-testid="ClaimWidget-default">
              <ClaimWidget provider={mockProvider} />
            </YStack>
          </YStack>
        )}

        {/* ---------------------------------------------------------------- Cobalt */}
        {activeTab === 'cobalt' && (
          <YStack gap="$4">
            <Card>
              <Heading level={4} color="#2E5DE8">
                Cobalt Host Override
              </Heading>
              <Text secondary>
                Token + component theme overrides applied via `themeOverrides`. Only this widget is
                mounted so its theme does not clash with other instances.
              </Text>
            </Card>
            {/* key forces a clean remount when the tab changes */}
            <YStack data-testid="ClaimWidget-cobalt">
              <ClaimWidget key="cobalt" provider={mockProvider} themeOverrides={cobaltOverrides} />
            </YStack>
          </YStack>
        )}

        {/* ----------------------------------------------------------------- Teal */}
        {activeTab === 'teal' && (
          <YStack gap="$4">
            <Card>
              <Heading level={4} color="#00A884">
                Teal Host Override
              </Heading>
              <Text secondary>
                A different brand palette applied via `themeOverrides`. Switching tabs unmounts the
                previous widget before mounting this one, keeping the Tamagui theme registry clean.
              </Text>
            </Card>
            <YStack data-testid="ClaimWidget-teal">
              <ClaimWidget key="teal" provider={mockProvider} themeOverrides={tealOverrides} />
            </YStack>
          </YStack>
        )}

        {/* ----------------------------------------------------------------- Info */}
        <Card>
          <Heading level={5}>Why tabs?</Heading>
          <Text secondary>
            Tamagui resolves theme tokens at mount time. Rendering multiple
            `GoodWidgetProvider` trees with different `themeOverrides` simultaneously causes the
            last-mounted provider to win for shared theme keys. Tabs ensure only one widget is
            active at a time, giving each instance a clean, isolated theme context.
          </Text>
          <Badge type="info" style={{ alignSelf: 'flex-start' }}>
            <BadgeText>See /theme-overrides for override precedence details</BadgeText>
          </Badge>
        </Card>
      </MiniAppShell>
    </GoodWidgetProvider>
  )
}
