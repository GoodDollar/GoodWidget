/**
 * SuperfluidCampaignWidget — Theme Overrides — demonstrates the widget's
 * scoped component sub-theme overrides (`CampaignShell`, `ActionCard`,
 * `LeaderboardSummary`, `LeaderboardRow`) alongside `Button`, live across both
 * `light` and `dark` themes.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { GoodWidgetThemeOverrides } from '@goodwidget/core'
import { ContentDefaultStory } from '../helpers/superfluidCampaignWidgetStories'
import { DocsCallout, DocsList } from '../docs/DocsLayout'

const CARD_FIELDS = ['background', 'borderColor', 'shadowColor']

const CONTROLLED_TARGETS: Array<{ name: string; fields: string[] }> = [
  {
    name: 'Button',
    fields: ['background', 'backgroundHover', 'backgroundPress', 'backgroundFocus', 'color'],
  },
  { name: 'CampaignShell', fields: ['borderColor'] },
  { name: 'ActionCard', fields: ['borderColor', 'shadowColor'] },
  { name: 'LeaderboardSummary', fields: ['borderColor'] },
]

const REFERENCE_ONLY_TARGETS: Array<{ name: string; fields: string[] }> = [
  { name: 'LeaderboardRow', fields: CARD_FIELDS },
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
  buttonBackground: string
  buttonBackgroundHover: string
  buttonBackgroundPress: string
  buttonBackgroundFocus: string
  buttonColor: string
  campaignShellBorderColor: string
  actionCardBorderColor: string
  actionCardShadowColor: string
  leaderboardSummaryBorderColor: string
}

function buildThemeOverrides(args: OverridesArgs): GoodWidgetThemeOverrides {
  const componentThemes = {
    Button: {
      background: args.buttonBackground,
      backgroundHover: args.buttonBackgroundHover,
      backgroundPress: args.buttonBackgroundPress,
      backgroundFocus: args.buttonBackgroundFocus,
      color: args.buttonColor,
    },
    CampaignShell: {
      borderColor: args.campaignShellBorderColor,
    },
    ActionCard: {
      borderColor: args.actionCardBorderColor,
      shadowColor: args.actionCardShadowColor,
    },
    LeaderboardSummary: {
      borderColor: args.leaderboardSummaryBorderColor,
    },
  }

  return {
    themes: {
      dark_Button: componentThemes.Button,
      light_Button: componentThemes.Button,
      dark_CampaignShell: componentThemes.CampaignShell,
      light_CampaignShell: componentThemes.CampaignShell,
      dark_ActionCard: componentThemes.ActionCard,
      light_ActionCard: componentThemes.ActionCard,
      dark_LeaderboardSummary: componentThemes.LeaderboardSummary,
      light_LeaderboardSummary: componentThemes.LeaderboardSummary,
    },
  }
}

const meta: Meta<OverridesArgs> = {
  title: 'Widgets/SuperfluidCampaignWidget/Theme overrides',
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    defaultTheme: {
      control: 'radio',
      options: ['light', 'dark'],
      description: 'Base theme applied via the widget’s own defaultTheme prop.',
    },
    buttonBackground: { control: 'color', description: 'themes.dark_Button.background' },
    buttonBackgroundHover: { control: 'color', description: 'themes.dark_Button.backgroundHover' },
    buttonBackgroundPress: { control: 'color', description: 'themes.dark_Button.backgroundPress' },
    buttonBackgroundFocus: { control: 'color', description: 'themes.dark_Button.backgroundFocus' },
    buttonColor: { control: 'color', description: 'themes.dark_Button.color' },
    campaignShellBorderColor: {
      control: 'color',
      description: 'themes.dark_CampaignShell.borderColor',
    },
    actionCardBorderColor: { control: 'color', description: 'themes.dark_ActionCard.borderColor' },
    actionCardShadowColor: { control: 'color', description: 'themes.dark_ActionCard.shadowColor' },
    leaderboardSummaryBorderColor: {
      control: 'color',
      description: 'themes.dark_LeaderboardSummary.borderColor',
    },
  },
  args: {
    defaultTheme: 'dark',
    buttonBackground: '#7C3AED',
    buttonBackgroundHover: '#6D28D9',
    buttonBackgroundPress: '#5B21B6',
    buttonBackgroundFocus: '#6D28D9',
    buttonColor: '#FFFFFF',
    campaignShellBorderColor: '#7C3AED',
    actionCardBorderColor: '#7C3AED',
    actionCardShadowColor: 'rgba(124, 58, 237, 0.5)',
    leaderboardSummaryBorderColor: '#7C3AED',
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
          {`<SuperfluidCampaignWidget\n  defaultTheme="${args.defaultTheme}"\n  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}\n/>`}
        </CodeBlock>

        <DocsCallout title="All overridable paths on SuperfluidCampaignWidget" tone="info">
          <DocsList>
            {CONTROLLED_TARGETS.map((target) => (
              <li key={target.name}>
                <strong>
                  dark_{target.name} / light_{target.name}
                </strong>
                : {target.fields.join(', ')} — wired to the controls above
              </li>
            ))}
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

        <ContentDefaultStory defaultTheme={args.defaultTheme} themeOverrides={themeOverrides} />
      </div>
    )
  },
}
