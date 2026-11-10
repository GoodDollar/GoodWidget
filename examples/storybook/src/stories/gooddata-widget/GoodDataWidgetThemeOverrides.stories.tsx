/**
 * GoodDataWidget — Theme Overrides — demonstrates the widget's token and base
 * theme override surface (`primary`, `success`, `background`, `color`) and
 * explicitly documents why `dark_Card` / `light_Card` overrides do not apply
 * (GoodDataWidget renders bare `Scorecard`, `LineAreaChart`, `PieDonutChart`,
 * and `DataTable` surfaces without wrapping them in `Card`).
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { TamaguiProvider } from '@tamagui/core'
import { createGoodWidgetConfig, type GoodWidgetThemeOverrides } from '@goodwidget/ui'
import { AiCreditsDashboard } from '@goodwidget/gooddata-widget'
import { DocsCallout, DocsList } from '../docs/DocsLayout'
import { FIXED_ANALYTICS_RESPONSE } from '../helpers/goodDataWidgetStories'

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        background: '#0f172a',
        border: '1px solid rgba(59,130,246,0.28)',
        borderRadius: 12,
        color: '#e2e8f0',
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        fontSize: 13,
        lineHeight: 1.6,
        margin: 0,
        overflowX: 'auto',
        padding: 18,
        whiteSpace: 'pre',
      }}
    >
      {children}
    </pre>
  )
}

interface OverridesArgs {
  defaultTheme: 'light' | 'dark'
  primaryColor: string
  successColor: string
}

function buildThemeOverrides(args: OverridesArgs): GoodWidgetThemeOverrides {
  return {
    tokens: {
      color: {
        primary: args.primaryColor,
        success: args.successColor,
      },
    },
    themes: {
      dark: {
        primary: args.primaryColor,
        success: args.successColor,
      },
      light: {
        primary: args.primaryColor,
        success: args.successColor,
      },
    },
  }
}

const meta: Meta<OverridesArgs> = {
  title: 'Widgets/GoodDataWidget/Theme overrides',
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    defaultTheme: {
      control: 'radio',
      options: ['light', 'dark'],
      description: 'Base theme passed to TamaguiProvider.',
    },
    primaryColor: {
      control: 'color',
      description: 'tokens.color.primary / themes.{dark,light}.primary',
    },
    successColor: {
      control: 'color',
      description: 'tokens.color.success / themes.{dark,light}.success',
    },
  },
  args: {
    defaultTheme: 'dark',
    primaryColor: '#7C3AED',
    successColor: '#10B981',
  },
}
export default meta
type Story = StoryObj<OverridesArgs>

export const Playground: Story = {
  render: (args) => {
    const themeOverrides = buildThemeOverrides(args)
    const config = createGoodWidgetConfig(themeOverrides)
    return (
      <div style={{ display: 'grid', gap: 24, maxWidth: 960, margin: '0 auto' }}>
        <CodeBlock>
          {`const config = createGoodWidgetConfig(${JSON.stringify(themeOverrides, null, 2)})\n\n<TamaguiProvider config={config} defaultTheme="${args.defaultTheme}">\n  <AiCreditsDashboard />\n</TamaguiProvider>`}
        </CodeBlock>

        <DocsCallout title="Explicit Card exemption on GoodDataWidget" tone="info">
          <DocsList>
            <li>
              <strong>No Card sub-theme surface</strong>: <code>GoodDataWidget</code> (and{' '}
              <code>AiCreditsDashboard</code>) renders bare <code>Scorecard</code>,{' '}
              <code>LineAreaChart</code>, <code>PieDonutChart</code>, and <code>DataTable</code>{' '}
              primitives directly without wrapping them in <code>Card</code>. Consequently,{' '}
              <code>dark_Card</code> / <code>light_Card</code> overrides are an explicit structural
              exemption here.
            </li>
            <li>
              <strong>Supported overrides</strong>: chart series and KPI accents read from{' '}
              <code>primary</code>, <code>success</code>, <code>color</code>, and{' '}
              <code>placeholderColor</code> on the base <code>dark</code> / <code>light</code>{' '}
              themes.
            </li>
          </DocsList>
        </DocsCallout>

        <TamaguiProvider config={config} defaultTheme={args.defaultTheme}>
          <AiCreditsDashboard mockState={{ kind: 'live', response: FIXED_ANALYTICS_RESPONSE }} />
        </TamaguiProvider>
      </div>
    )
  },
}
