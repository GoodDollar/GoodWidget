/**
 * GoodReserveWidget — Theme Overrides — demonstrates the widget's public theming
 * surface as live color-picker controls.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { GoodWidgetThemeOverrides } from '@goodwidget/core'
import { DocsCallout, DocsList } from '../docs/DocsLayout'
import { GoodReserveWidget } from "@goodwidget/goodreserve-widget"
import { reserveWidgetMockStates } from "../../fixtures/goodReserveWidgetMock"

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        background: '#0f172a',
        border: '1px solid rgba(59,130,246,0.28)',
        borderRadius: 12,
        color: '#e2e8f0',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
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
  buttonBackgroundHover: string
  buttonColor: string
  cardBorderColor: string
}

function buildThemeOverrides(args: OverridesArgs): GoodWidgetThemeOverrides {
  return {
    themes: {
      dark_Button: {
        background: args.buttonBackground,
        backgroundHover: args.buttonBackgroundHover,
        color: args.buttonColor,
      },
      light_Button: {
        background: args.buttonBackground,
        backgroundHover: args.buttonBackgroundHover,
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
  title: 'Widgets/GoodReserveWidget/Theme overrides',
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    buttonBackground: { control: 'color', description: 'themes.dark_Button.background' },
    buttonBackgroundHover: { control: 'color', description: 'themes.dark_Button.backgroundHover' },
    buttonColor: { control: 'color', description: 'themes.dark_Button.color' },
    cardBorderColor: { control: 'color', description: 'themes.dark_Card.borderColor' },
  },
  args: {
    buttonBackground: '#7C3AED',
    buttonBackgroundHover: '#6D28D9',
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
          {`<GoodReserveWidget\n  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}\n/>`}
        </CodeBlock>

        <DocsCallout title="All overridable paths" tone="info">
          <DocsList>
            <li><strong>dark_Button / light_Button</strong>: background, backgroundHover, color</li>
            <li><strong>dark_Card / light_Card</strong>: borderColor</li>
          </DocsList>
        </DocsCallout>

        <div style={{ padding: '20px', background: '#0f172a', borderRadius: 8 }}>
           <GoodReserveWidget provider={null} mockState={reserveWidgetMockStates.quoteReady} themeOverrides={themeOverrides} />
        </div>
      </div>
    )
  },
}
