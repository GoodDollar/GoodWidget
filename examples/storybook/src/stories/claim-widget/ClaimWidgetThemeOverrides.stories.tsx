/**
 * ClaimWidget Theme Demo — Theme Overrides — demonstrates the widget's public
 * theming surface as live color-picker controls, one row per field, all
 * visible without expanding a collapsed tree. The code snippet is generated
 * from the live arg values, so it can never drift from what's rendered.
 *
 * ClaimWidget (@goodwidget/claim-widget-theme-demo) defines its own local
 * ClaimActionGlow/Ring/Inner components (same field shape as the shared
 * packages/ui/src/components/CircularActionButton.tsx) plus a plain `Button`
 * used for the "Reset Demo" action. See packages/claim-widget-theme-demo/src/ClaimWidget.tsx.
 *
 * Controls are wired for `dark_Button`, `dark_ClaimActionGlow`,
 * `dark_ClaimActionRing`, and `dark_ClaimCard` — a handful of high-impact
 * targets that visibly shift the default brand, not exhaustive coverage of
 * every value. `dark_ClaimActionInner` and `dark_TokenAmountText` follow the
 * same pattern and are documented below for reference.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { GoodWidgetThemeOverrides } from '@goodwidget/core'
import { ClaimWidgetStoryCanvas } from '../helpers/claimWidgetStories'
import { DocsCallout, DocsList } from '../docs/DocsLayout'

const REFERENCE_ONLY_TARGETS: Array<{ name: string; fields: string[] }> = [
  { name: 'ClaimActionInner', fields: ['backgroundDark', 'backgroundDarkHover'] },
  { name: 'TokenAmountText', fields: ['color', 'secondaryColor'] },
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
  buttonBackground: string
  buttonBackgroundHover: string
  buttonBackgroundPress: string
  buttonBackgroundFocus: string
  buttonColor: string
  claimActionGlowBackground: string
  claimActionRingPrimary: string
  claimCardBorderColor: string
}

function buildThemeOverrides(args: OverridesArgs): GoodWidgetThemeOverrides {
  return {
    themes: {
      dark_Button: {
        background: args.buttonBackground,
        backgroundHover: args.buttonBackgroundHover,
        backgroundPress: args.buttonBackgroundPress,
        backgroundFocus: args.buttonBackgroundFocus,
        color: args.buttonColor,
      },
      dark_ClaimActionGlow: {
        backgroundColor: args.claimActionGlowBackground,
      },
      dark_ClaimActionRing: {
        primary: args.claimActionRingPrimary,
      },
      dark_ClaimCard: {
        borderColor: args.claimCardBorderColor,
      },
    },
  }
}

const meta: Meta<OverridesArgs> = {
  title: 'Widgets/ClaimWidget Theme Demo/Theme overrides',
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    buttonBackground: { control: 'color', description: 'themes.dark_Button.background' },
    buttonBackgroundHover: { control: 'color', description: 'themes.dark_Button.backgroundHover' },
    buttonBackgroundPress: { control: 'color', description: 'themes.dark_Button.backgroundPress' },
    buttonBackgroundFocus: { control: 'color', description: 'themes.dark_Button.backgroundFocus' },
    buttonColor: { control: 'color', description: 'themes.dark_Button.color' },
    claimActionGlowBackground: {
      control: 'color',
      description: 'themes.dark_ClaimActionGlow.backgroundColor',
    },
    claimActionRingPrimary: { control: 'color', description: 'themes.dark_ClaimActionRing.primary' },
    claimCardBorderColor: { control: 'color', description: 'themes.dark_ClaimCard.borderColor' },
  },
  args: {
    buttonBackground: '#7C3AED',
    buttonBackgroundHover: '#6D28D9',
    buttonBackgroundPress: '#5B21B6',
    buttonBackgroundFocus: '#6D28D9',
    buttonColor: '#FFFFFF',
    claimActionGlowBackground: '#7C3AED',
    claimActionRingPrimary: '#7C3AED',
    claimCardBorderColor: '#7C3AED',
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
          {`<ClaimWidget\n  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}\n/>`}
        </CodeBlock>

        <DocsCallout title="All overridable paths on ClaimWidget Theme Demo" tone="info">
          <DocsList>
            <li>
              <strong>dark_Button / light_Button</strong>: background, backgroundHover,
              backgroundPress, backgroundFocus, color, borderColor, borderColorFocus, shadowColor —
              wired to the controls above
            </li>
            <li>
              <strong>dark_ClaimActionGlow / light_ClaimActionGlow</strong>: backgroundColor,
              glowOpacity, glowOffset — wired to the controls above (backgroundColor only)
            </li>
            <li>
              <strong>dark_ClaimActionRing / light_ClaimActionRing</strong>: primary, primaryLight —
              wired to the controls above (primary only)
            </li>
            <li>
              <strong>dark_ClaimCard / light_ClaimCard</strong>: background, borderColor,
              shadowColor — wired to the controls above (borderColor only)
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

        <ClaimWidgetStoryCanvas
          dataTestId="ClaimWidget-theme-overrides"
          defaultTheme="dark"
          themeOverrides={themeOverrides}
        />
      </div>
    )
  },
}
