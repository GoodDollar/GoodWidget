/**
 * GoodReserveWidget Theme Demo — Theme Overrides
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { GoodWidgetThemeOverrides } from '@goodwidget/core'
import { renderStory } from './GoodReserveWidget.stories'
import { reserveWidgetMockStates } from '../../fixtures/goodReserveWidgetMock'
import { DocsCallout, DocsList } from '../docs/DocsLayout'

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        background: '#0f172a',
        border: '1px solid rgba(59,130,246,0.28)',
        borderRadius: 12,
        color: '#e2e8f0',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
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
  primaryColor: string
}

function buildThemeOverrides(args: OverridesArgs): GoodWidgetThemeOverrides {
  return {
    themes: {
      dark_Button: {
        background: args.primaryColor,
        color: '#FFFFFF'
      },
      light_Button: {
        background: args.primaryColor,
        color: '#FFFFFF'
      },
    },
  }
}

const meta: Meta<OverridesArgs> = {
  title: 'Widgets/GoodReserveWidget/Theme overrides',
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    primaryColor: { control: 'color', description: 'Primary override color' },
  },
  args: {
    primaryColor: '#7C3AED',
  },
}
export default meta
type Story = StoryObj<OverridesArgs>

export const Playground: Story = {
  render: (args) => {
    const themeOverrides = buildThemeOverrides(args)
    // Note: GoodReserveWidget.stories.tsx doesn't natively accept themeOverrides via QuoteReadyBuy.render
    // but we can render it directly or wrap it if needed. 
    // Wait, QuoteReadyBuy doesn't accept themeOverrides directly in GoodReserveWidget.stories.tsx.
    // I will mock it here directly.
    return (
      <div style={{ display: 'grid', gap: 24, maxWidth: 560, margin: '0 auto' }}>
        <CodeBlock>
          {`<GoodReserveWidget\n  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}\n/>`}
        </CodeBlock>
        <DocsCallout title="All overridable paths" tone="info">
          <DocsList>
            <li><strong>dark_Button / light_Button</strong>: background, color</li>
          </DocsList>
        <div style={{ marginTop: 24 }}>
          {renderStory(reserveWidgetMockStates.quoteReady, 'GoodReserveWidget-theme', 'dark', themeOverrides)}
        </div>
      </div>
    )
  },
}
