/**
 * AiCreditsWidget — Theme Overrides — demonstrates the widget's public theming
 * surface as live color-picker controls. The code snippet is generated from the
 * live arg values, so it can never drift from what's rendered.
 *
 * NOTE ON CARD BACKGROUNDS:
 * In AiCreditsWidget, the hero balance card (`AiCreditsHero.tsx`) is rendered as:
 *   `<Card gap="$4" backgroundColor="$backgroundSurface">`
 * Because `backgroundColor="$backgroundSurface"` is passed explicitly as a prop,
 * Tamagui resolves `$backgroundSurface` against the active base theme (`dark` / `light`).
 * Attempting to override `dark_Card.background` has NO effect because the explicit
 * JSX prop overrides the Card component default `$background`.
 * To customize the hero card's background, integrators must override
 * `themes.dark.backgroundSurface` and `themes.light.backgroundSurface`.
 *
 * Buttons throughout the widget use the shared `@goodwidget/ui` Button primitive,
 * styled via `dark_Button` / `light_Button`.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { GoodWidgetThemeOverrides } from '@goodwidget/core'
import { ThemedAiCreditsStory } from '../helpers/aiCreditsWidgetStories'
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
  heroBackground: string
  buttonBackground: string
}

function buildThemeOverrides(args: OverridesArgs): GoodWidgetThemeOverrides {
  return {
    themes: {
      dark: {
        backgroundSurface: args.heroBackground,
      },
      light: {
        backgroundSurface: args.heroBackground,
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
  title: 'Widgets/AiCreditsWidget/Theme overrides',
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    defaultTheme: {
      control: 'radio',
      options: ['dark', 'light'],
      description: 'Base theme applied via the widget’s own defaultTheme prop.',
    },
    heroBackground: {
      control: 'color',
      description: 'Base theme backgroundSurface token (styles AiCreditsHero card background)',
    },
    buttonBackground: {
      control: 'color',
      description: 'themes.dark_Button.background / themes.light_Button.background',
    },
  },
  args: {
    defaultTheme: 'dark',
    heroBackground: '#1E1B4B',
    buttonBackground: '#7C3AED',
  },
}
export default meta
type Story = StoryObj<OverridesArgs>

export const Playground: Story = {
  render: (args) => {
    const themeOverrides = buildThemeOverrides(args)
    return (
      <div style={{ display: 'grid', gap: 24, maxWidth: 440, margin: '0 auto' }}>
        <CodeBlock>
          {`<AiCreditsWidget\n  defaultTheme="${args.defaultTheme}"\n  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}\n/>`}
        </CodeBlock>

        <DocsCallout title="All overridable paths on AiCreditsWidget" tone="info">
          <DocsList>
            <li>
              <strong>dark.backgroundSurface / light.backgroundSurface</strong>: Hero card background.
              Note: <code>dark_Card.background</code> is a no-op for the hero card because{' '}
              <code>AiCreditsHero</code> specifies <code>backgroundColor="$backgroundSurface"</code> explicitly.
            </li>
            <li>
              <strong>dark_Button / light_Button</strong>: Action button background, hover, and press states.
            </li>
          </DocsList>
        </DocsCallout>

        <ThemedAiCreditsStory defaultTheme={args.defaultTheme} themeOverrides={themeOverrides} />
      </div>
    )
  },
}
