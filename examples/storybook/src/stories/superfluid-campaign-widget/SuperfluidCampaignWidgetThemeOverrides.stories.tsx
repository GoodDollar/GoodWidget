/**
 * SuperfluidCampaignWidget — Theme Overrides — demonstrates the widget's public
 * theming surface as live color-picker controls. The code snippet is generated
 * from the live arg values, so it can never drift from what's rendered.
 *
 * NOTE ON CARD BACKGROUNDS:
 * In SuperfluidCampaignWidget, the outer card container is rendered as:
 *   `<Card padding={0} backgroundColor="$backgroundDark" width="100%">`
 * Because `backgroundColor="$backgroundDark"` is specified explicitly as a prop,
 * Tamagui resolves `$backgroundDark` against the active base theme (`dark` / `light`).
 * Attempting to override `dark_Card.background` has NO effect because the explicit
 * JSX prop overrides the Card component default `$background`.
 * To customize the outer card background, integrators must override
 * `themes.dark.backgroundDark` and `themes.light.backgroundDark`.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { GoodWidgetThemeOverrides } from '@goodwidget/core'
import { ThemedSuperfluidStory } from '../helpers/superfluidCampaignWidgetStories'
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
  defaultTheme: 'light' | 'dark'
  cardBackgroundDark: string
  cardBackgroundLight: string
  buttonBackground: string
}

function buildThemeOverrides(args: OverridesArgs): GoodWidgetThemeOverrides {
  return {
    themes: {
      dark: {
        backgroundDark: args.cardBackgroundDark,
      },
      light: {
        backgroundDark: args.cardBackgroundLight,
      },
      dark_Button: {
        background: args.buttonBackground,
        backgroundHover: args.buttonBackground,
        backgroundPress: args.buttonBackground,
        backgroundFocus: args.buttonBackground,
      },
      light_Button: {
        background: args.buttonBackground,
        backgroundHover: args.buttonBackground,
        backgroundPress: args.buttonBackground,
        backgroundFocus: args.buttonBackground,
      },
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
      options: ['dark', 'light'],
      description: 'Base theme applied via the widget’s own defaultTheme prop.',
    },
    cardBackgroundDark: {
      control: 'color',
      description: 'themes.dark.backgroundDark token (styles SuperfluidCampaignWidget outer Card in dark mode)',
    },
    cardBackgroundLight: {
      control: 'color',
      description: 'themes.light.backgroundDark token (styles SuperfluidCampaignWidget outer Card in light mode)',
    },
    buttonBackground: {
      control: 'color',
      description: 'themes.dark_Button.background / themes.light_Button.background',
    },
  },
  args: {
    defaultTheme: 'dark',
    cardBackgroundDark: '#1E1B4B',
    cardBackgroundLight: '#E0E7FF',
    buttonBackground: '#7C3AED',
  },
}
export default meta
type Story = StoryObj<OverridesArgs>

export const Playground: Story = {
  render: (args) => {
    const themeOverrides = buildThemeOverrides(args)
    return (
      <div style={{ display: 'grid', gap: 24, maxWidth: 520, margin: '0 auto' }}>
        <CodeBlock>
          {`<SuperfluidCampaignWidget\n  defaultTheme="${args.defaultTheme}"\n  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}\n/>`}
        </CodeBlock>

        <DocsCallout title="All overridable paths on SuperfluidCampaignWidget" tone="info">
          <DocsList>
            <li>
              <strong>dark.backgroundDark / light.backgroundDark</strong>: Outer card background.
              Note: <code>dark_Card.background</code> is a no-op for the container because{' '}
              <code>SuperfluidCampaignWidget</code> specifies <code>backgroundColor="$backgroundDark"</code> explicitly.
              This base theme key cascades to every surface in the widget that references <code>$backgroundDark</code>,
              not only the outer card.
            </li>
            <li>
              <strong>dark_Button / light_Button</strong>: Header action buttons, wallet connect button, and action card CTA buttons.
            </li>
          </DocsList>
        </DocsCallout>

        <ThemedSuperfluidStory defaultTheme={args.defaultTheme} themeOverrides={themeOverrides} />
      </div>
    )
  },
}
