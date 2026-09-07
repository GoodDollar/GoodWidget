/**
 * GooddataWidget Theme Demo — Theme Overrides
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { GoodWidgetThemeOverrides } from '@goodwidget/core'
import { AiCreditsDashboardDemoStory } from '../helpers/goodDataWidgetStories'
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
      dark_Card: {
        borderColor: args.primaryColor,
      },
      light_Card: {
        borderColor: args.primaryColor,
      },
    },
  }
}

const meta: Meta<OverridesArgs> = {
  title: 'Widgets/GooddataWidget/Theme overrides',
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
    return (
      <div style={{ display: 'grid', gap: 24, maxWidth: 560, margin: '0 auto' }}>
        <CodeBlock>
          {`<GooddataWidget\n  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}\n/>`}
        </CodeBlock>
        <DocsCallout title="All overridable paths" tone="info">
          <DocsList>
            <li><strong>dark_Card / light_Card</strong>: borderColor</li>
          </DocsList>
        </DocsCallout>
        
        <div style={{ marginTop: 24 }}>
            <AiCreditsDashboardDemoStory defaultTheme="dark" themeOverrides={themeOverrides} />
        </div>
      </div>
    )
  },
}
