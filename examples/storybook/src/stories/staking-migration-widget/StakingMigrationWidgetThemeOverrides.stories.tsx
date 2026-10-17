/**
 * StakingMigrationWidget — Theme Overrides — demonstrates the widget's public
 * theming surface as live color-picker controls, one row per field, all
 * visible without expanding a collapsed tree. The code snippet is generated
 * from the live arg values, so it can never drift from what's rendered.
 *
 * StakingMigrationWidget has no local named-theme components of its own: its
 * cards reuse the base preset's `ClaimCard`/`StreakCard` names (see
 * packages/staking-migration-widget/src/migrationWidgetComponents.ts) and its
 * circular action button is the shared
 * packages/ui/src/components/CircularActionButton.tsx (ClaimActionGlow/Ring/
 * Inner) also used by ai-credits-widget. Its step list uses the shared
 * Stepper component (dark_StepperStepContent / light_StepperStepContent).
 *
 * Controls are wired for both `dark_*` and `light_*` variants of `ClaimCard`,
 * `ClaimActionGlow`, and `ClaimActionRing` — a handful of high-impact targets
 * that visibly shift the default brand in both themes, not exhaustive coverage
 * of every value. `ClaimActionInner`, `StreakCard`, and `StepperStepContent`
 * follow the same pattern across `dark_*` and `light_*` and are documented
 * below for reference. There is no `Button` override here since this widget has
 * no plain `Button` usage — its only action is the circular claim/migrate button.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { GoodWidgetThemeOverrides } from '@goodwidget/core'
import { ReadyStory } from '../helpers/stakingMigrationWidgetStories'
import { DocsCallout, DocsList } from '../docs/DocsLayout'

const REFERENCE_ONLY_TARGETS: Array<{ name: string; fields: string[] }> = [
  { name: 'ClaimActionInner', fields: ['backgroundDark', 'backgroundDarkHover'] },
  { name: 'StreakCard', fields: ['background', 'borderColor', 'shadowColor'] },
  { name: 'StepperStepContent', fields: ['background', 'borderColor'] },
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
  claimCardBorderColor: string
  lightClaimCardBorderColor: string
  claimActionGlowBackground: string
  lightClaimActionGlowBackground: string
  claimActionRingPrimary: string
  lightClaimActionRingPrimary: string
}

function buildThemeOverrides(args: OverridesArgs): GoodWidgetThemeOverrides {
  return {
    themes: {
      dark_ClaimCard: {
        borderColor: args.claimCardBorderColor,
      },
      light_ClaimCard: {
        borderColor: args.lightClaimCardBorderColor,
      },
      dark_ClaimActionGlow: {
        backgroundColor: args.claimActionGlowBackground,
      },
      light_ClaimActionGlow: {
        backgroundColor: args.lightClaimActionGlowBackground,
      },
      dark_ClaimActionRing: {
        primary: args.claimActionRingPrimary,
      },
      light_ClaimActionRing: {
        primary: args.lightClaimActionRingPrimary,
      },
    },
  }
}

const meta: Meta<OverridesArgs> = {
  title: 'Widgets/StakingMigrationWidget/Theme overrides',
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    claimCardBorderColor: { control: 'color', description: 'themes.dark_ClaimCard.borderColor' },
    lightClaimCardBorderColor: {
      control: 'color',
      description: 'themes.light_ClaimCard.borderColor',
    },
    claimActionGlowBackground: {
      control: 'color',
      description: 'themes.dark_ClaimActionGlow.backgroundColor',
    },
    lightClaimActionGlowBackground: {
      control: 'color',
      description: 'themes.light_ClaimActionGlow.backgroundColor',
    },
    claimActionRingPrimary: {
      control: 'color',
      description: 'themes.dark_ClaimActionRing.primary',
    },
    lightClaimActionRingPrimary: {
      control: 'color',
      description: 'themes.light_ClaimActionRing.primary',
    },
  },
  args: {
    claimCardBorderColor: '#7C3AED',
    lightClaimCardBorderColor: '#7C3AED',
    claimActionGlowBackground: '#7C3AED',
    lightClaimActionGlowBackground: '#7C3AED',
    claimActionRingPrimary: '#7C3AED',
    lightClaimActionRingPrimary: '#7C3AED',
  },
}
export default meta
type Story = StoryObj<OverridesArgs>

export const Playground: Story = {
  render: (args) => {
    const themeOverrides = buildThemeOverrides(args)
    return (
      <div style={{ display: 'grid', gap: 24, maxWidth: 960, margin: '0 auto' }}>
        <CodeBlock>
          {`<StakingMigrationWidget\n  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}\n/>`}
        </CodeBlock>

        <DocsCallout title="All overridable paths on StakingMigrationWidget" tone="info">
          <DocsList>
            <li>
              <strong>dark_ClaimCard / light_ClaimCard</strong>: background, borderColor,
              shadowColor — wired to the controls above (borderColor) for both dark and light modes
            </li>
            <li>
              <strong>dark_ClaimActionGlow / light_ClaimActionGlow</strong>: backgroundColor,
              glowOpacity, glowOffset — wired to the controls above (backgroundColor) for both dark
              and light modes
            </li>
            <li>
              <strong>dark_ClaimActionRing / light_ClaimActionRing</strong>: primary, primaryLight —
              wired to the controls above (primary) for both dark and light modes
            </li>
            {REFERENCE_ONLY_TARGETS.map((target) => (
              <li key={target.name}>
                <strong>
                  dark_{target.name} / light_{target.name}
                </strong>
                : {target.fields.join(', ')}
              </li>
            ))}
          </DocsList>
        </DocsCallout>

        <DocsCallout title="Why two columns" tone="info">
          Each surface renders once in dark and once in light so every wired `light_*` control has a
          visibly-exercised counterpart alongside `dark_*`.
        </DocsCallout>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div data-testid="StakingMigrationWidget-theme-overrides-dark">
            <ReadyStory defaultTheme="dark" themeOverrides={themeOverrides} />
          </div>
          <div data-testid="StakingMigrationWidget-theme-overrides-light">
            <ReadyStory defaultTheme="light" themeOverrides={themeOverrides} />
          </div>
        </div>
      </div>
    )
  },
}
