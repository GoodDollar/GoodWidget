/**
 * ClaimWidget — full GoodDollar claim flow.
 *
 * Stories use the deterministic mock EIP-1193 provider so the widget renders
 * in a "connected" state without requiring a real browser wallet.
 *
 * Each story mounts exactly one ClaimWidget so there is never more than one
 * GoodWidgetProvider with themeOverrides in the tree at a time — this avoids
 * Tamagui theme-key clashing (last-mounted provider winning).
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { ClaimWidget } from '@goodwidget/claim-widget-theme-demo'
import { YStack } from '@goodwidget/ui'
import { createMockEip1193Provider } from '../../fixtures/mockEip1193'

// Stable mock provider — created once at module level to prevent re-render churn.
const mockProvider = createMockEip1193Provider()

/** Cobalt brand overrides (matches the "Host / Cobalt" tab in ThemePlayground). */
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

/** Teal brand overrides. */
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

const meta: Meta<typeof ClaimWidget> = {
  title: 'Theme/ClaimWidgetThemeDemo',
  component: ClaimWidget,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj<typeof ClaimWidget>

/** Default preset — no overrides, GoodWalletV2 baseline. */
export const Default: Story = {
  render: () => (
    <YStack data-testid="ClaimWidget-default" style={{ width: 380 }}>
      <ClaimWidget provider={mockProvider} />
    </YStack>
  ),
}

/** Cobalt brand — token + component theme overrides via themeOverrides. */
export const CobaltBrand: Story = {
  render: () => (
    <YStack data-testid="ClaimWidget-cobalt" style={{ width: 380 }}>
      <ClaimWidget provider={mockProvider} themeOverrides={cobaltOverrides} />
    </YStack>
  ),
}

/** Teal brand — a different brand palette via themeOverrides. */
export const TealBrand: Story = {
  render: () => (
    <YStack data-testid="ClaimWidget-teal" style={{ width: 380 }}>
      <ClaimWidget provider={mockProvider} themeOverrides={tealOverrides} />
    </YStack>
  ),
}
