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
  swapShellBackground: string
  amountCardBackground: string
  submitButtonBackground: string
}

function buildThemeOverrides(args: OverridesArgs): GoodWidgetThemeOverrides {
  return {
    themes: {
      dark: {
        backgroundSurface: args.swapShellBackground,
        backgroundInput: args.amountCardBackground,
      },
      light: {
        backgroundSurface: args.swapShellBackground,
        backgroundInput: args.amountCardBackground,
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
    swapShellBackground: {
      control: 'color',
      description: 'Base theme backgroundSurface token (styles outer swap card shell)',
    },
    amountCardBackground: {
      control: 'color',
      description: 'Base theme backgroundInput token (styles amount input card panels)',
    },
    submitButtonBackground: {
      control: 'color',
      description: 'themes.dark_Button.background / themes.light_Button.background',
    },
  },
  args: {
    defaultTheme: 'dark',
    swapShellBackground: '#1E1B4B',
    amountCardBackground: '#0F172A',
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
              <strong>dark.backgroundSurface / light.backgroundSurface</strong>: Outer swap shell card background.
              Note: <code>dark_Card.background</code> is a no-op because <code>ReserveSwapShell</code> specifies{' '}
              <code>backgroundColor: '$backgroundSurface'</code> explicitly.
            </li>
            <li>
              <strong>dark.backgroundInput / light.backgroundInput</strong>: Amount card panel backgrounds.
              Note: <code>ReserveAmountCard</code> specifies <code>backgroundColor: '$backgroundInput'</code> explicitly.
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
