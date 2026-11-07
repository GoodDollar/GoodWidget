/**
 * GoodReserveWidget — Theme Overrides — demonstrates the widget's public theming
 * surface as live color-picker controls. The code snippet is generated from the
 * live arg values, so it can never drift from what's rendered.
 *
 * NOTE ON CARD BACKGROUNDS:
 * In GoodReserveWidget, the swap container (`SwapShell`) uses `backgroundColor: '$backgroundSurface'`,
 * and the amount panels (`AmountCard`) use `backgroundColor: '$backgroundInput'`.
 * Because these styled components explicitly set their background color to `$backgroundSurface`
 * and `$backgroundInput`, Tamagui resolves those tokens against the active base theme (`dark` / `light`).
 * Attempting to override `dark_Card.background` has NO effect because explicit component props
 * override the Card component default `$background`.
 * To customize the swap card and amount card backgrounds, integrators must override
 * `themes.dark.backgroundSurface` / `themes.dark.backgroundInput` (and corresponding light keys).
 *
 * Swap action buttons use the shared `@goodwidget/ui` Button primitive, styled via
 * `dark_Button` / `light_Button`.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { GoodWidgetThemeOverrides } from '@goodwidget/core'
import { GoodReserveWidget } from '@goodwidget/goodreserve-widget'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import { reserveWidgetMockStates } from '../../fixtures/goodReserveWidgetMock'
import { DocsCallout, DocsList } from '../docs/DocsLayout'

const provider = createCustodialEip1193Provider()

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
  swapShellBackgroundDark: string
  swapShellBackgroundLight: string
  amountCardBackgroundDark: string
  amountCardBackgroundLight: string
  cardBorderColorDark: string
  cardBorderColorLight: string
  submitButtonBackground: string
}

function buildThemeOverrides(args: OverridesArgs): GoodWidgetThemeOverrides {
  return {
    themes: {
      dark: {
        backgroundSurface: args.swapShellBackgroundDark,
        backgroundInput: args.amountCardBackgroundDark,
      },
      light: {
        backgroundSurface: args.swapShellBackgroundLight,
        backgroundInput: args.amountCardBackgroundLight,
      },
      dark_Card: {
        borderColor: args.cardBorderColorDark,
      },
      light_Card: {
        borderColor: args.cardBorderColorLight,
      },
      dark_Button: {
        background: args.submitButtonBackground,
        backgroundHover: args.submitButtonBackground,
        backgroundPress: args.submitButtonBackground,
        backgroundFocus: args.submitButtonBackground,
      },
      light_Button: {
        background: args.submitButtonBackground,
        backgroundHover: args.submitButtonBackground,
        backgroundPress: args.submitButtonBackground,
        backgroundFocus: args.submitButtonBackground,
      },
    },
  }
}

const meta: Meta<OverridesArgs> = {
  title: 'Widgets/GoodReserveWidget/Theme overrides',
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  argTypes: {
    defaultTheme: {
      control: 'radio',
      options: ['dark', 'light'],
      description: 'Base theme applied via the widget’s own defaultTheme prop.',
    },
    swapShellBackgroundDark: {
      control: 'color',
      description: 'themes.dark.backgroundSurface token (styles outer swap card shell in dark mode)',
    },
    swapShellBackgroundLight: {
      control: 'color',
      description: 'themes.light.backgroundSurface token (styles outer swap card shell in light mode)',
    },
    amountCardBackgroundDark: {
      control: 'color',
      description: 'themes.dark.backgroundInput token (styles amount input card panels in dark mode)',
    },
    amountCardBackgroundLight: {
      control: 'color',
      description: 'themes.light.backgroundInput token (styles amount input card panels in light mode)',
    },
    cardBorderColorDark: {
      control: 'color',
      description: 'themes.dark_Card.borderColor (styles swap shell and amount card borders in dark mode)',
    },
    cardBorderColorLight: {
      control: 'color',
      description: 'themes.light_Card.borderColor (styles swap shell and amount card borders in light mode)',
    },
    submitButtonBackground: {
      control: 'color',
      description: 'themes.dark_Button.background / themes.light_Button.background',
    },
  },
  args: {
    defaultTheme: 'dark',
    swapShellBackgroundDark: '#1E1B4B',
    swapShellBackgroundLight: '#E0E7FF',
    amountCardBackgroundDark: '#0F172A',
    amountCardBackgroundLight: '#D3DCFE',
    cardBorderColorDark: '#7C3AED',
    cardBorderColorLight: '#7C3AED',
    submitButtonBackground: '#7C3AED',
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
          {`<GoodReserveWidget\n  defaultTheme="${args.defaultTheme}"\n  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}\n/>`}
        </CodeBlock>

        <DocsCallout title="All overridable paths on GoodReserveWidget" tone="info">
          <DocsList>
            <li>
              <strong>dark_Card.borderColor / light_Card.borderColor</strong>: Swap shell and amount card border colors.
            </li>
            <li>
              <strong>dark.backgroundSurface / light.backgroundSurface</strong>: Outer swap shell card background.
              Note: <code>dark_Card.background</code> is a no-op because <code>ReserveSwapShell</code> specifies{' '}
              <code>backgroundColor: '$backgroundSurface'</code> explicitly. These base theme keys cascade to every
              surface referencing <code>$backgroundSurface</code> across the widget, not only the outer card.
            </li>
            <li>
              <strong>dark.backgroundInput / light.backgroundInput</strong>: Amount card panel backgrounds.
              Note: <code>ReserveAmountCard</code> specifies <code>backgroundColor: '$backgroundInput'</code> explicitly.
              These keys cascade to input and action surfaces (amount panels, details table, flip button, and settings button).
              Note: Token badges and confirm highlights use <code>$backgroundSurfaceAlt</code>, which is not wired to a control
              and retains the base theme color.
            </li>
            <li>
              <strong>dark_Button / light_Button</strong>: Swap action button background, hover, and press states.
            </li>
          </DocsList>
        </DocsCallout>

        <div data-testid="GoodReserveWidget-themed" style={{ width: 390, margin: '0 auto' }}>
          <GoodReserveWidget
            provider={provider}
            mockState={reserveWidgetMockStates.quoteReady}
            defaultTheme={args.defaultTheme}
            themeOverrides={themeOverrides}
          />
        </div>
      </div>
    )
  },
}
