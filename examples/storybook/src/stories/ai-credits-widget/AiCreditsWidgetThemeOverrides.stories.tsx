/**
 * AiCreditsWidget — Theme Overrides
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { GoodWidgetThemeOverrides } from '@goodwidget/core'
import { AiCreditsWidget } from '@goodwidget/ai-credits-widget'
import { DocsCallout, DocsList } from '../docs/DocsLayout'

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
  buttonBackground: string
  buttonColor: string
  cardBorderColor: string
}

function buildThemeOverrides(args: OverridesArgs): GoodWidgetThemeOverrides {
  return {
    themes: {
      dark_Button: {
        background: args.buttonBackground,
        color: args.buttonColor,
      },
      light_Button: {
        background: args.buttonBackground,
        color: args.buttonColor,
      },
      dark_Card: {
        borderColor: args.cardBorderColor,
      },
      light_Card: {
        borderColor: args.cardBorderColor,
      },
    },
  }
}

const meta: Meta<OverridesArgs> = {
  title: 'Widgets/AiCreditsWidget/Theme overrides',
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    buttonBackground: { control: 'color', description: 'themes.dark_Button.background' },
    buttonColor: { control: 'color', description: 'themes.dark_Button.color' },
    cardBorderColor: { control: 'color', description: 'themes.dark_Card.borderColor' },
  },
  args: {
    buttonBackground: '#7C3AED',
    buttonColor: '#FFFFFF',
    cardBorderColor: '#7C3AED',
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
          {`<AiCreditsWidget\n  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}\n/>`}
        </CodeBlock>
        <DocsCallout title="All overridable paths" tone="info">
          <DocsList>
            <li><strong>dark_Button / light_Button</strong>: background, color</li>
            <li><strong>dark_Card / light_Card</strong>: borderColor</li>
            <li><strong>dark_AiCreditsStatusNotice / light_AiCreditsStatusNotice</strong>: backgroundColor</li>
          </DocsList>
        </DocsCallout>
        
        <AiCreditsWidget defaultTheme="dark" themeOverrides={themeOverrides} environment="production" />
      </div>
    )
  },
}
