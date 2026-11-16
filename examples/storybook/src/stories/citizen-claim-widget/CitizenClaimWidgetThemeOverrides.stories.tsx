/**
 * CitizenClaimWidget — Theme Overrides — demonstrates the widget's primitive
 * theming surface (`Card`/`Button` from `packages/ui`) as live color-picker
 * controls, following the StreamingWidget/StakingMigrationWidget Theme
 * overrides pattern for structure (CodeBlock + DocsCallout + live Canvas).
 *
 * This widget's own named sub-themes — `ClaimCard`, `ClaimActionButton`,
 * `ClaimActionGlow` (see packages/citizen-claim-widget/src/CitizenClaimWidget.tsx)
 * — already have dedicated `light_*`/`dark_*` presets in packages/ui/src/presets.ts,
 * so overriding the plain `Card`/`Button` theme would be a no-op against the
 * widget's default claim-tab surface, which renders through those named
 * components instead. To avoid that no-op, this story targets the two
 * surfaces confirmed to actually render the plain primitives:
 *   - the plain `<Button>` on the identity-verification step (shown when the
 *     connected wallet is not yet whitelisted)
 *   - the plain `<Card>` placeholder on the Invite Rewards / News tabs
 * Both are rendered in dark and light side by side so every wired `dark_*`
 * control has a visibly-exercised `light_*` counterpart, not just a paired
 * control that happens to exist.
 *
 * The identity-verification Button is reached via the custodial local-wallet
 * fixture (same known, never-whitelisted test key already used in
 * `QA/CitizenClaimWidget/Runtime Fixtures`), which resolves to the
 * `not_whitelisted` status against live Celo RPC — the same deterministic
 * live-RPC approach the Playwright spec for this widget relies on. The Card
 * placeholder is reached via the widget's own `initialTab` prop, no mocking
 * required.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { CitizenClaimWidgetProps } from '@goodwidget/citizen-claim-widget'
import { CustodialLocalFixtureStory } from '../helpers/citizenClaimWidgetStories'
import { DocsCallout, DocsList } from '../docs/DocsLayout'

type ThemeOverrides = NonNullable<CitizenClaimWidgetProps['themeOverrides']>

const REFERENCE_ONLY_TARGETS: Array<{ name: string; fields: string[] }> = [
  { name: 'ClaimCard', fields: ['background', 'borderColor', 'shadowColor'] },
  { name: 'ClaimActionButton', fields: ['background', 'backgroundHover', 'color'] },
  { name: 'ClaimActionGlow', fields: ['backgroundColor', 'glowOpacity'] },
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
  darkCardBackground: string
  darkCardBorderColor: string
  lightCardBackground: string
  lightCardBorderColor: string
  darkButtonBackground: string
  darkButtonBackgroundHover: string
  darkButtonColor: string
  lightButtonBackground: string
  lightButtonBackgroundHover: string
  lightButtonColor: string
}

function buildThemeOverrides(args: OverridesArgs): ThemeOverrides {
  return {
    themes: {
      dark_Card: {
        background: args.darkCardBackground,
        borderColor: args.darkCardBorderColor,
      },
      light_Card: {
        background: args.lightCardBackground,
        borderColor: args.lightCardBorderColor,
      },
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
  title: 'Widgets/CitizenClaimWidget/Theme overrides',
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    darkCardBackground: { control: 'color', description: 'themes.dark_Card.background' },
    darkCardBorderColor: { control: 'color', description: 'themes.dark_Card.borderColor' },
    lightCardBackground: { control: 'color', description: 'themes.light_Card.background' },
    lightCardBorderColor: { control: 'color', description: 'themes.light_Card.borderColor' },
    darkButtonBackground: { control: 'color', description: 'themes.dark_Button.background' },
    darkButtonBackgroundHover: { control: 'color', description: 'themes.dark_Button.backgroundHover' },
    darkButtonColor: { control: 'color', description: 'themes.dark_Button.color' },
    lightButtonBackground: { control: 'color', description: 'themes.light_Button.background' },
    lightButtonBackgroundHover: { control: 'color', description: 'themes.light_Button.backgroundHover' },
    lightButtonColor: { control: 'color', description: 'themes.light_Button.color' },
  },
  args: {
    darkCardBackground: '#1e1b4b',
    darkCardBorderColor: '#7C3AED',
    lightCardBackground: '#f5f3ff',
    lightCardBorderColor: '#7C3AED',
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
    return (
      <div style={{ display: 'grid', gap: 24, maxWidth: 960, margin: '0 auto' }}>
        <CodeBlock>
          {`<CitizenClaimWidget\n  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}\n/>`}
        </CodeBlock>

        <DocsCallout title="All overridable paths on CitizenClaimWidget" tone="info">
          <DocsList>
            <li>
              <strong>dark_Card / light_Card</strong>: background, color, borderColor, shadowColor —
              background and borderColor wired to the controls above; demonstrated on the Invite
              Rewards/News placeholder below, the only plain-Card surface this widget renders
            </li>
            <li>
              <strong>dark_Button / light_Button</strong>: background, backgroundHover,
              backgroundPress, backgroundFocus, color, borderColor, borderColorFocus, shadowColor —
              background, backgroundHover, and color wired to the controls above; demonstrated on the
              identity-verification Verify button below, the only plain-Button surface this widget
              renders
            </li>
            {REFERENCE_ONLY_TARGETS.map((target) => (
              <li key={target.name}>
                <strong>
                  dark_{target.name} / light_{target.name}
                </strong>
                : {target.fields.join(', ')} — already has a dedicated preset in packages/ui, so a
                plain Card/Button override does not reach it
              </li>
            ))}
          </DocsList>
        </DocsCallout>

        <DocsCallout title="Why two columns" tone="info">
          Each surface renders once in dark and once in light so every wired `light_*` control has a
          visibly-exercised counterpart, not just a paired value that happens to exist.
        </DocsCallout>

        <div>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>
            Button surface — identity verification step (not-whitelisted custodial fixture)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <CustodialLocalFixtureStory defaultTheme="dark" themeOverrides={themeOverrides} />
            <CustodialLocalFixtureStory defaultTheme="light" themeOverrides={themeOverrides} />
          </div>
        </div>

        <div>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>
            Card surface — Invite Rewards / News tab placeholder
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <CustodialLocalFixtureStory
              defaultTheme="dark"
              themeOverrides={themeOverrides}
              initialTab="invite-rewards"
            />
            <CustodialLocalFixtureStory
              defaultTheme="light"
              themeOverrides={themeOverrides}
              initialTab="invite-rewards"
            />
          </div>
        </div>
      </div>
    )
  },
}
