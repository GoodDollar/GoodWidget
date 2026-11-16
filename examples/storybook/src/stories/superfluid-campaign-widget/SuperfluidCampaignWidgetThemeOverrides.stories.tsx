/**
 * SuperfluidCampaignWidget — Theme Overrides — demonstrates the widget's
 * primitive theming surface (`Card`/`Button` from packages/ui) as live
 * color-picker controls, following the GoodReserveWidget/AiCreditsWidget
 * Theme overrides pattern for structure (CodeBlock + DocsCallout + live Canvas).
 *
 * Unlike GoodReserveWidget and AiCreditsWidget, this package defines no
 * named theme-component module at all (confirmed: zero `createComponent`
 * calls anywhere in packages/superfluid-campaign-widget/src) — every Card
 * and Button in the widget (outer shell, ActionCard, LeaderboardSummary,
 * LeaderboardRow, pagination/CTA buttons) is a plain primitive, so
 * dark_Card/light_Card/dark_Button/light_Button are the only override
 * paths this widget has. This is a design-system gap worth tracking
 * separately, not something to fix by inventing a new named module here.
 *
 * The default "content" view with a populated leaderboard scenario is used
 * because it renders the outer shell Card, an ActionCard, and the
 * LeaderboardSummary card together with their CTA buttons in one view.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { type SuperfluidCampaignWidgetProps } from '@goodwidget/superfluid-campaign-widget'
import { MockSuperfluidCampaignWidget } from '@goodwidget/superfluid-campaign-widget/mocked'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import { DocsCallout, DocsList } from '../docs/DocsLayout'

const provider = createCustodialEip1193Provider()

type ThemeOverrides = NonNullable<SuperfluidCampaignWidgetProps['themeOverrides']>

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        background: '#0f172a',
        color: '#e2e8f0',
        padding: 16,
        borderRadius: 8,
        overflowX: 'auto',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <code>{children}</code>
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
  title: 'Widgets/SuperfluidCampaignWidget/Theme overrides',
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    darkCardBackground: { control: 'color', description: 'themes.dark_Card.background' },
    darkCardBorderColor: { control: 'color', description: 'themes.dark_Card.borderColor' },
    lightCardBackground: { control: 'color', description: 'themes.light_Card.background' },
    lightCardBorderColor: { control: 'color', description: 'themes.light_Card.borderColor' },
    darkButtonBackground: { control: 'color', description: 'themes.dark_Button.background' },
    darkButtonBackgroundHover: {
      control: 'color',
      description: 'themes.dark_Button.backgroundHover',
    },
    darkButtonColor: { control: 'color', description: 'themes.dark_Button.color' },
    lightButtonBackground: { control: 'color', description: 'themes.light_Button.background' },
    lightButtonBackgroundHover: {
      control: 'color',
      description: 'themes.light_Button.backgroundHover',
    },
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
          {`<SuperfluidCampaignWidget\n  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}\n/>`}
        </CodeBlock>
        <DocsCallout title="All overridable paths on SuperfluidCampaignWidget" tone="info">
          <DocsList>
            <li>
              <strong>dark_Card / light_Card</strong>: outer widget shell, ActionCard, the
              LeaderboardSummary card, and each LeaderboardRow all cascade from this theme —
              demonstrated below on the outer shell and ActionCard.
            </li>
            <li>
              <strong>dark_Button / light_Button</strong>: the "Claim SUP rewards" header CTA,
              wallet connect button, action-card CTAs, "View Leaderboard" button, and leaderboard
              pagination all cascade from this theme — demonstrated below on the action-card CTA
              and the "View Leaderboard" button.
            </li>
          </DocsList>
        </DocsCallout>
        <DocsCallout title="No named theme-component module" tone="warning">
          This widget has no `createComponent(Card, ...)`/`createComponent(Button, ...)` module
          (unlike AiCreditsWidget or GoodReserveWidget), so there are no dedicated sub-theme
          targets to override independently of the plain Card/Button theme shown here. Tracked as
          a design-system gap rather than addressed in this change.
        </DocsCallout>
        <div>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>
            Content view, populated leaderboard scenario — shell card, action card, and CTA
            buttons together
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div data-testid="SuperfluidCampaignWidget-theme-overrides-dark" style={{ width: 420 }}>
              <MockSuperfluidCampaignWidget
                provider={provider}
                initialView="content"
                leaderboardScenario="populated"
                defaultTheme="dark"
                themeOverrides={themeOverrides}
              />
            </div>
            <div data-testid="SuperfluidCampaignWidget-theme-overrides-light" style={{ width: 420 }}>
              <MockSuperfluidCampaignWidget
                provider={provider}
                initialView="content"
                leaderboardScenario="populated"
                defaultTheme="light"
                themeOverrides={themeOverrides}
              />
            </div>
          </div>
        </div>
      </div>
    )
  },
}
