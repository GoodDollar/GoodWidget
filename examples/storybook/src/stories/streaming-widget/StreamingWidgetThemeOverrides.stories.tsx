/**
 * StreamingWidget Theme Overrides — demonstrates the widget's full public
 * theming surface (the named component sub-themes it renders through), live.
 *
 * Unlike the Showcase story's fixed brand-preset picker, this exposes real
 * `themeOverrides.themes` fields as individual color-picker controls — one
 * row per field, all visible in the Controls panel without expanding a
 * collapsed tree. The code snippet is generated from the live arg values
 * rather than hardcoded, so it can never drift from what's actually rendered.
 *
 * Guiding text reuses the same DocsLayout building blocks as the docs pages
 * (Integrators/Theming And Overrides, etc.) so this reads as a continuation
 * of that guide rather than a separate visual language.
 *
 * StreamingWidget uses `Button` directly for its primary actions (no
 * StreamingWidget-specific sub-theme), plus six Card-derived named
 * components that fall back to Card's field set since they don't have their
 * own preset entries. See packages/streaming-widget/src/components/shared.tsx.
 *
 * Controls are wired for `dark_Button` and the two targets rendered in the
 * PopulatedStateStory fixture (`dark_StreamRow`, `dark_BalanceCard`) — a
 * couple of high-impact targets that visibly shift the default brand, not
 * exhaustive coverage of every value. The remaining Card-derived targets
 * follow the same field shape and are documented below for reference.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { StreamingWidgetProps } from '@goodwidget/streaming-widget'
import { PopulatedStateStory } from '../helpers/streamingWidgetStories'
import { withDefaultPreset } from '../helpers/withDefaultPreset'
import { DocsCallout, DocsList } from '../docs/DocsLayout'

type ThemeOverrides = NonNullable<StreamingWidgetProps['themeOverrides']>

const CARD_FIELDS = ['background', 'borderColor', 'shadowColor']

const CONTROLLED_TARGETS: Array<{ name: string; fields: string[] }> = [
  {
    name: 'Button',
    fields: ['background', 'backgroundHover', 'backgroundPress', 'backgroundFocus', 'color'],
  },
  { name: 'StreamRow', fields: ['borderColor'] },
  { name: 'BalanceCard', fields: ['borderColor', 'shadowColor'] },
]

const REFERENCE_ONLY_TARGETS: Array<{ name: string; fields: string[] }> = [
  { name: 'PoolRow', fields: CARD_FIELDS },
  { name: 'EmptyStateCard', fields: CARD_FIELDS },
  { name: 'ErrorStateCard', fields: CARD_FIELDS },
  { name: 'SetStreamFormCard', fields: CARD_FIELDS },
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
  streamRowBorderColor: string
  balanceCardBorderColor: string
  balanceCardShadowColor: string
}

function buildThemeOverrides(args: OverridesArgs): ThemeOverrides {
  return {
    themes: {
      dark_Button: {
        background: args.buttonBackground,
        backgroundHover: args.buttonBackgroundHover,
        backgroundPress: args.buttonBackgroundPress,
        backgroundFocus: args.buttonBackgroundFocus,
        color: args.buttonColor,
      },
      dark_StreamRow: {
        borderColor: args.streamRowBorderColor,
      },
      dark_BalanceCard: {
        borderColor: args.balanceCardBorderColor,
        shadowColor: args.balanceCardShadowColor,
      },
    },
  }
}

const meta: Meta<OverridesArgs> = {
  title: 'Widgets/StreamingWidget/Theme overrides',
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  decorators: [withDefaultPreset],
  argTypes: {
    buttonBackground: { control: 'color', description: 'themes.dark_Button.background' },
    buttonBackgroundHover: { control: 'color', description: 'themes.dark_Button.backgroundHover' },
    buttonBackgroundPress: { control: 'color', description: 'themes.dark_Button.backgroundPress' },
    buttonBackgroundFocus: { control: 'color', description: 'themes.dark_Button.backgroundFocus' },
    buttonColor: { control: 'color', description: 'themes.dark_Button.color' },
    streamRowBorderColor: { control: 'color', description: 'themes.dark_StreamRow.borderColor' },
    balanceCardBorderColor: { control: 'color', description: 'themes.dark_BalanceCard.borderColor' },
    balanceCardShadowColor: { control: 'color', description: 'themes.dark_BalanceCard.shadowColor' },
  },
  args: {
    buttonBackground: '#7C3AED',
    buttonBackgroundHover: '#6D28D9',
    buttonBackgroundPress: '#5B21B6',
    buttonBackgroundFocus: '#6D28D9',
    buttonColor: '#FFFFFF',
    streamRowBorderColor: '#7C3AED',
    balanceCardBorderColor: '#7C3AED',
    balanceCardShadowColor: 'rgba(124, 58, 237, 0.6)',
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
          {`<StreamingWidget\n  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}\n/>`}
        </CodeBlock>

        <DocsCallout title="All overridable paths on StreamingWidget" tone="info">
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

        <PopulatedStateStory defaultTheme="dark" themeOverrides={themeOverrides} />
      </div>
    )
  },
}
