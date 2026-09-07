/**
 * CitizenClaimWidget Theme Demo — Theme Overrides
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { GoodWidgetThemeOverrides } from '@goodwidget/core'
import { InjectedWalletStory } from '../helpers/citizenClaimWidgetStories'
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
      dark_ClaimCard: {
        borderColor: args.primaryColor,
      },
      light_ClaimCard: {
        borderColor: args.primaryColor,
      },
      dark_ClaimActionGlow: {
        backgroundColor: args.primaryColor,
      },
      light_ClaimActionGlow: {
        backgroundColor: args.primaryColor,
      },
    },
  }
}

const meta: Meta<OverridesArgs> = {
  title: 'Widgets/CitizenClaimWidget/Theme overrides',
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
          {`<CitizenClaimWidget\n  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}\n/>`}
        </CodeBlock>
        <DocsCallout title="All overridable paths" tone="info">
          <DocsList>
            <li><strong>dark_ClaimCard / light_ClaimCard</strong>: borderColor</li>
            <li><strong>dark_ClaimActionGlow / light_ClaimActionGlow</strong>: backgroundColor</li>
          </DocsList>
        </DocsCallout>
        
        <div style={{ marginTop: 24 }}>
            <InjectedWalletStory defaultTheme="dark" themeOverrides={themeOverrides} />
        </div>
      </div>
    )
  },
}
