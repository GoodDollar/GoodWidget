/**
 * GoodDataWidget — Theme Overrides — demonstrates the widget's primitive
 * `Button` theme target as live color-picker controls, following the
 * GoodReserveWidget/AiCreditsWidget Theme overrides pattern for structure
 * (CodeBlock + DocsCallout + live Canvas).
 *
 * Button-only, no Card control: confirmed via `grep -rln "Card"
 * packages/gooddata-widget/src` (zero matches) that this widget never
 * renders a `Card` anywhere in its source — a dark_Card/light_Card control
 * would be a no-op, so it is intentionally omitted rather than wired as a
 * silent no-op.
 *
 * The demo fixture state uses the "demo" mockState (fixed, deterministic
 * data) rather than the live connector, so the Theme overrides controls
 * stay reproducible regardless of the AntSeed Worker's live availability.
 * It renders the refresh button, the Live/Demo data-source toggle buttons,
 * and the paginated table's First/Prev/Next/Last buttons together.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { TamaguiProvider } from '@tamagui/core'
import { createGoodWidgetConfig } from '@goodwidget/ui'
import { AiCreditsDashboard, type AnalyticsResponse } from '@goodwidget/gooddata-widget'
import { DocsCallout, DocsList } from '../docs/DocsLayout'

// Fixed (non-random, non-"now") fixture so the Playground renders identically on every load.
const DEMO_ANALYTICS_RESPONSE: AnalyticsResponse = {
  days: 3,
  daily: [
    {
      date: '2026-01-01',
      gdOneTimeDepositsWei: '1000000000000000000000',
      gdStreamedWei: '250000000000000000000',
      gdTotalFlowRateWeiPerSecond: '2000000000000000',
      aiCreditsUsedWei: '50000000',
      uniqueGdSigners: 4,
      uniqueCreditUsers: 2,
      updatedAt: '2026-01-02T00:00:00.000Z',
      missing: false,
    },
    {
      date: '2026-01-02',
      gdOneTimeDepositsWei: '1500000000000000000000',
      gdStreamedWei: '280000000000000000000',
      gdTotalFlowRateWeiPerSecond: '3000000000000000',
      aiCreditsUsedWei: '75000000',
      uniqueGdSigners: 6,
      uniqueCreditUsers: 3,
      updatedAt: '2026-01-03T00:00:00.000Z',
      missing: false,
    },
    {
      date: '2026-01-03',
      gdOneTimeDepositsWei: '2000000000000000000000',
      gdStreamedWei: '370000000000000000000',
      gdTotalFlowRateWeiPerSecond: '4000000000000000',
      aiCreditsUsedWei: '100000000',
      uniqueGdSigners: 8,
      uniqueCreditUsers: 5,
      updatedAt: '2026-01-04T00:00:00.000Z',
      missing: false,
    },
  ],
  global: {
    gdOneTimeDepositsWei: '4500000000000000000000',
    gdStreamedWei: '900000000000000000000',
    aiCreditsUsedWei: '225000000',
    gdTotalFlowRateWeiPerSecond: '4000000000000000',
    updatedAt: '2026-01-04T00:00:00.000Z',
  },
  lastRun: {
    currentDate: '2026-01-04',
    updatedAt: '2026-01-04T00:00:00.000Z',
  },
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        background: '#0f172a',
        color: '#e2e8f0',
        padding: 16,
        borderRadius: 8,
        overflowX: 'auto',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <code>{children}</code>
    </pre>
  )
}

interface OverridesArgs {
  darkButtonBackground: string
  darkButtonBackgroundHover: string
  darkButtonColor: string
  lightButtonBackground: string
  lightButtonBackgroundHover: string
  lightButtonColor: string
}

function buildThemeOverrides(args: OverridesArgs) {
  return {
    themes: {
      dark_Button: {
        background: args.darkButtonBackground,
        backgroundHover: args.darkButtonBackgroundHover,
        color: args.darkButtonColor,
      },
      light_Button: {
        background: args.lightButtonBackground,
        backgroundHover: args.lightButtonBackgroundHover,
        color: args.lightButtonColor,
      },
    },
  }
}

const meta: Meta<OverridesArgs> = {
  title: 'Widgets/GoodDataWidget/Theme overrides',
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    darkButtonBackground: { control: 'color', description: 'themes.dark_Button.background' },
    darkButtonBackgroundHover: {
      control: 'color',
      description: 'themes.dark_Button.backgroundHover',
    },
    darkButtonColor: { control: 'color', description: 'themes.dark_Button.color' },
    lightButtonBackground: { control: 'color', description: 'themes.light_Button.background' },
    lightButtonBackgroundHover: {
      control: 'color',
      description: 'themes.light_Button.backgroundHover',
    },
    lightButtonColor: { control: 'color', description: 'themes.light_Button.color' },
  },
  args: {
    darkButtonBackground: '#7C3AED',
    darkButtonBackgroundHover: '#6D28D9',
    darkButtonColor: '#FFFFFF',
    lightButtonBackground: '#7C3AED',
    lightButtonBackgroundHover: '#6D28D9',
    lightButtonColor: '#FFFFFF',
  },
}
export default meta
type Story = StoryObj<OverridesArgs>

export const Playground: Story = {
  render: (args) => {
    const themeOverrides = buildThemeOverrides(args)
    // GoodDataWidget has no GoodWidgetProvider/themeOverrides prop of its own
    // (it only ever receives a bare TamaguiProvider from its host), so this
    // Playground builds the same merged Tamagui config createGoodWidgetConfig
    // produces inside every other widget's provider, instead of relying on
    // a themeOverrides prop that doesn't exist here.
    const tamaguiConfig = createGoodWidgetConfig(themeOverrides)
    return (
      <div style={{ display: 'grid', gap: 24, maxWidth: 960, margin: '0 auto' }}>
        <CodeBlock>
          {`// GoodDataWidget has no themeOverrides prop — the host's own\n// TamaguiProvider owns theming, same as createGoodWidgetConfig()\n// does inside every other widget's GoodWidgetProvider:\nconst config = createGoodWidgetConfig(${JSON.stringify(themeOverrides, null, 2)})\n<TamaguiProvider config={config}>\n  <GoodDataWidget />\n</TamaguiProvider>`}
        </CodeBlock>
        <DocsCallout title="All overridable paths on GoodDataWidget" tone="info">
          <DocsList>
            <li>
              <strong>dark_Button / light_Button</strong>: the refresh button, the Live/Demo
              data-source toggle, and the paginated table&apos;s First/Prev/Next/Last buttons all
              cascade from this theme — demonstrated below.
            </li>
          </DocsList>
        </DocsCallout>
        <DocsCallout title="No Card control" tone="warning">
          GoodDataWidget renders no `Card` anywhere in its source (confirmed via grep), so a
          dark_Card/light_Card control would be a no-op here and is intentionally omitted.
        </DocsCallout>
        <div>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>
            Demo dataset — refresh button, data-source toggle, and pagination together
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div data-testid="GoodDataWidget-theme-overrides-dark">
              <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
                <AiCreditsDashboard mockState={{ kind: 'demo', response: DEMO_ANALYTICS_RESPONSE }} />
              </TamaguiProvider>
            </div>
            <div data-testid="GoodDataWidget-theme-overrides-light">
              <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
                <AiCreditsDashboard mockState={{ kind: 'demo', response: DEMO_ANALYTICS_RESPONSE }} />
              </TamaguiProvider>
            </div>
          </div>
        </div>
      </div>
    )
  },
}
