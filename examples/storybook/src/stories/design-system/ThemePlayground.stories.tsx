/**
 * ThemePlayground — interactive exploration of GoodWidget's override system.
 *
 * This story group covers the four supported override layers in order of precedence:
 *   1. Default preset (GoodWalletV2 dark baseline — no overrides)
 *   2. Token overrides — broad brand/palette/scale changes
 *   3. Component sub-theme overrides — targeted named-component skinning
 *   4. Host themeOverrides — runtime integrator overrides (merged last)
 * Each story mounts a single ClaimWidget to avoid Tamagui theme-key clashing.
 *
 * See docs/demo-environment.md for the full override precedence model.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { ClaimWidget } from '@goodwidget/claim-widget-theme-demo'
import { Card, Heading, Text, Alert, YStack } from '@goodwidget/ui'
import { createMockEip1193Provider } from '../../fixtures/mockEip1193'

const mockProvider = createMockEip1193Provider()

const meta: Meta = {
  title: 'Design System/Theming/Override Playground',
  tags: ['autodocs', 'integrator', 'showcase'],
  parameters: { layout: 'padded' },
}
export default meta
type Story = StoryObj

/**
 * Default preset — the GoodWalletV2 dark base design system, no runtime overrides.
 * This is what every widget instance looks like out of the box.
 */
export const DefaultPreset: Story = {
  render: () => (
    <YStack gap="$4" style={{ width: 400 }}>
      <Alert
        type="info"
        title="Preset Baseline"
        message="No runtime overrides. The GoodWalletV2 dark preset drives all tokens, themes, and component sub-themes."
      />
      <ClaimWidget provider={mockProvider} defaultTheme="dark" />
    </YStack>
  ),
}

/**
 * Token overrides — broad changes via `config.tokens`.
 *
 * Tokens are static design primitives (palette, scale, spacing). Changing a
 * token cascades through every theme and component that consumes it.
 * Use this layer for brand-wide color changes.
 */
export const TokenOverride: Story = {
  render: () => (
    <YStack gap="$4" style={{ width: 400 }}>
      <Alert
        type="warning"
        title="Token Override"
        message="Token overrides are broad. Updating primary cascades through derived theme values and components that consume those semantics."
      />
      <Card>
        <Heading level={5}>How it works</Heading>
      <Text variant="caption">
        {`<ClaimWidget
  config={{
    tokens: {
      color: { primary: '#4F7DFF', primaryDark: '#2E5DE8', primaryLight: '#7FA4FF' }
    }
  }}
/>`}
        </Text>
      </Card>
      <ClaimWidget
        provider={mockProvider}
        defaultTheme="dark"
        config={{
          tokens: {
            color: {
              primary: '#4F7DFF',
              primaryDark: '#2E5DE8',
              primaryLight: '#7FA4FF',
            },
          },
        }}
      />
    </YStack>
  ),
}

/**
 * Component sub-theme override — targeted via `config.themes`.
 *
 * Named components in GoodWidget (e.g. ClaimCard, ClaimActionGlow) opt into
 * named component sub-themes. Overriding `dark_ClaimActionGlow` only affects
 * that specific named component, not the whole widget.
 *
 * These overrides are intended for widget *authors*, not host integrators.
 */
export const ComponentThemeOverride: Story = {
  render: () => (
    <YStack gap="$4" style={{ width: 400 }}>
      <Alert
        type="warning"
        title="Component Theme Override"
        message="Targeted overrides via named component sub-themes. Intended for widget authors, not public host integrators."
      />
      <Card>
        <Heading level={5}>How it works</Heading>
      <Text variant="caption">
        {`<ClaimWidget
  config={{
    themes: {
      dark_ClaimActionGlow: { primary: '#12cb31', primaryLight: '#9A4DFF' },
      dark_ClaimActionRing: { primary: '#ff3333', primaryLight: '#9A4DFF' },
      dark_ClaimActionInner: { backgroundDark: 'orange' },
    }
  }}
/>`}
        </Text>
      </Card>
      <ClaimWidget
        provider={mockProvider}
        defaultTheme="dark"
        config={{
          themes: {
            dark_ClaimActionGlow: { primary: '#12cb31', primaryLight: '#9A4DFF' },
            dark_ClaimActionRing: { primary: '#ff3333', primaryLight: '#9A4DFF' },
            dark_ClaimActionInner: { backgroundDark: 'orange', backgroundDarkHover: 'red' },
            dark_TokenAmountText: { color: 'red', secondaryColor: '#3fbdf2' },
          },
        }}
      />
    </YStack>
  ),
}

/**
 * Host themeOverrides — the public integrator API.
 *
 * `themeOverrides` are the runtime override layer exposed to host applications.
 * They are merged last and win over the preset and widget-author config.
 * Use this layer when embedding a GoodWidget in your own dapp or wallet.
 */
export const HostOverrideCobalt: Story = {
  render: () => (
    <YStack gap="$4" style={{ width: 400 }}>
      <Alert
        type="warning"
        title="Host themeOverrides — Cobalt"
        message="themeOverrides are the public integrator API. Merged last, they win over preset + author config."
      />
      <Card>
        <Heading level={5}>How it works</Heading>
      <Text variant="caption">
        {`<ClaimWidget
  themeOverrides={{
    tokens: { color: { primary: '#2E5DE8', ... } },
    themes: {
      light_ClaimCard: { borderColor: '#2E5DE8' },
      ...
    }
  }}
/>`}
        </Text>
      </Card>
      <ClaimWidget
        provider={mockProvider}
        defaultTheme="dark"
        themeOverrides={{
          tokens: {
            color: { primary: '#2E5DE8', primaryDark: '#1D3EB2', primaryLight: '#6E8DFF' },
          },
          themes: {
            dark_ClaimCard: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.7)' },
            dark_ClaimActionGlow: { primary: '#4F7DFF', primaryLight: '#9DB4FF' },
            dark_ClaimActionRing: { primary: '#2E5DE8', primaryLight: '#6E8DFF' },
            dark_ClaimActionInner: { backgroundDark: '#0E1A3A', backgroundDarkHover: '#172B60' },
            dark_TokenAmountText: { color: '#BBD0FF', secondaryColor: '#7FA2FF' },
          },
        }}
      />
    </YStack>
  ),
}

/**
 * Host themeOverrides — Teal brand variant.
 */
export const HostOverrideTeal: Story = {
  render: () => (
    <YStack gap="$4" style={{ width: 400 }}>
      <Alert
        type="info"
        title="Host themeOverrides — Teal"
        message="A different brand palette applied via themeOverrides. Same API, different brand."
      />
      <ClaimWidget
        provider={mockProvider}
        defaultTheme="dark"
        themeOverrides={{
          tokens: {
            color: { primary: '#00A884', primaryDark: '#007A61', primaryLight: '#33C9AA' },
          },
          themes: {
            dark_ClaimCard: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.65)' },
            dark_ClaimActionGlow: { primary: '#33C9AA', primaryLight: '#78E0CB' },
            dark_ClaimActionRing: { primary: '#00A884', primaryLight: '#33C9AA' },
            dark_ClaimActionInner: { backgroundDark: '#062A23', backgroundDarkHover: '#0B3B31' },
            dark_TokenAmountText: { color: '#BFF5E7', secondaryColor: '#66D5BB' },
          },
        }}
      />
    </YStack>
  ),
}
