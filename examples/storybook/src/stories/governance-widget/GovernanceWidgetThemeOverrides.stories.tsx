/**
 * GovernanceWidget — Theme Overrides — demonstrates the widget's public theming
 * surface as live color-picker controls. The code snippet is generated from the
 * live arg values, so it can never drift from what's rendered.
 *
 * GovernanceWidget's own named theme components (packages/governance-widget/src/shared.tsx)
 * are `GovernanceWrapper` (the card shell every section — impact, alignment voting,
 * optimistic voting, funding distribution — renders inside of) and `ImpactCard` /
 * `ImpactCardAction` (the impact summary card and its call-to-action button). All other
 * governance surfaces reuse shared @goodwidget/ui components (`BalanceCard`, `Button`)
 * that already have theme keys wired for other widgets — those are documented as
 * reference-only below since they aren't governance-specific.
 *
 * Controls are wired for `dark_GovernanceWrapper` and `dark_ImpactCard` /
 * `dark_ImpactCardAction` — the handful of high-impact targets that visibly shift the
 * default brand, not exhaustive coverage of every value.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { GoodWidgetThemeOverrides } from '@goodwidget/core'
import { ThemedDashboardStory } from '../helpers/governanceWidgetStories'
import { DocsCallout, DocsList } from '../docs/DocsLayout'

const REFERENCE_ONLY_TARGETS: Array<{ name: string; fields: string[] }> = [
  { name: 'BalanceCard', fields: ['background', 'borderColor', 'shadowColor'] },
  { name: 'Button', fields: ['background', 'color', 'borderColor'] },
]

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
  wrapperBorderColor: string
  wrapperShadowColor: string
  impactCardBackground: string
  impactCardActionBackground: string
}

function buildThemeOverrides(args: OverridesArgs): GoodWidgetThemeOverrides {
  const componentThemes = {
    GovernanceWrapper: {
      borderColor: args.wrapperBorderColor,
      shadowColor: args.wrapperShadowColor,
    },
    ImpactCard: {
      background: args.impactCardBackground,
    },
    ImpactCardAction: {
      white: args.impactCardActionBackground,
    },
  }

  return {
    themes: {
      dark_GovernanceWrapper: componentThemes.GovernanceWrapper,
      light_GovernanceWrapper: componentThemes.GovernanceWrapper,
      dark_ImpactCard: componentThemes.ImpactCard,
      light_ImpactCard: componentThemes.ImpactCard,
      dark_ImpactCardAction: componentThemes.ImpactCardAction,
      light_ImpactCardAction: componentThemes.ImpactCardAction,
    },
  }
}

const meta: Meta<OverridesArgs> = {
  title: 'Widgets/GovernanceWidget/Theme overrides',
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    defaultTheme: {
      control: 'radio',
      options: ['light', 'dark'],
      description: 'Base theme applied via the widget’s own defaultTheme prop.',
    },
    wrapperBorderColor: { control: 'color', description: 'themes.dark_GovernanceWrapper.borderColor' },
    wrapperShadowColor: { control: 'color', description: 'themes.dark_GovernanceWrapper.shadowColor' },
    impactCardBackground: { control: 'color', description: 'themes.dark_ImpactCard.backgroundColor' },
    impactCardActionBackground: {
      control: 'color',
      description: 'themes.dark_ImpactCardAction.backgroundColor',
    },
  },
  args: {
    defaultTheme: 'light',
    wrapperBorderColor: '#7C3AED',
    wrapperShadowColor: '#7C3AED',
    impactCardBackground: '#1E1B4B',
    impactCardActionBackground: '#7C3AED',
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
          {`<GovernanceWidget\n  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}\n/>`}
        </CodeBlock>

        <DocsCallout title="All overridable paths on GovernanceWidget" tone="info">
          <DocsList>
            <li>
              <strong>dark_GovernanceWrapper / light_GovernanceWrapper</strong>: backgroundColor,
              borderColor, color, shadowColor — wired to the controls above (borderColor and
              shadowColor only)
            </li>
            <li>
              <strong>dark_ImpactCard / light_ImpactCard</strong>: backgroundColor, borderColor,
              color — wired to the controls above (backgroundColor only)
            </li>
            <li>
              <strong>dark_ImpactCardAction / light_ImpactCardAction</strong>: backgroundColor,
              color — wired to the controls above (backgroundColor only)
            </li>
            {REFERENCE_ONLY_TARGETS.map((target) => (
              <li key={target.name}>
                <strong>
                  dark_{target.name} / light_{target.name}
                </strong>
                : {target.fields.join(', ')} — shared with other widgets, not governance-specific
              </li>
            ))}
          </DocsList>
        </DocsCallout>

        <ThemedDashboardStory defaultTheme={args.defaultTheme} themeOverrides={themeOverrides} />
      </div>
    )
  },
}
