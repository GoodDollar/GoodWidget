/**
 * GoodReserveWidget — Theme Overrides — demonstrates the widget's primitive
 * theming surface (`Card`/`Button` from `packages/ui`) as live color-picker
 * controls, following the StreamingWidget/StakingMigrationWidget Theme
 * overrides pattern for structure (CodeBlock + DocsCallout + live Canvas).
 *
 * This widget's own named sub-themes — `ReserveSwapShell`, `ReserveAmountCard`,
 * `ReserveSurface`, `ReserveSurfaceInner`, `ReserveDetailsTable`,
 * `ReserveTokenBadge`, `ReserveSwapDirectionButton`, `ReserveSettingsButton`,
 * `ReserveSuccessIcon`, `ReserveConfirmToBadge` (see
 * packages/goodreserve-widget/src/ReserveSwapView.tsx) — have no dedicated
 * `light_*`/`dark_*` presets in packages/ui/src/presets.ts (confirmed via
 * grep), so they correctly cascade from the plain `Card`/`Button` theme
 * instead of overriding it, unlike CitizenClaimWidget's `ClaimCard` family.
 * A `dark_Card`/`dark_Button` override is NOT a no-op here.
 *
 * The idle-buy fixture state is used because it renders the outer swap card
 * (`ReserveSwapShell`, extends Card), the amount panels (`ReserveAmountCard`,
 * extends Card), and the plain primary-CTA `<Button>` together in one state,
 * so a single pair of dark/light instances exercises both targets at once.
 */
import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { GoodReserveWidget, type ReserveSwapWidgetProps } from '@goodwidget/goodreserve-widget'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'
import { reserveWidgetMockStates } from '../../fixtures/goodReserveWidgetMock'
import { DocsCallout, DocsList } from '../docs/DocsLayout'

const provider = createCustodialEip1193Provider()

type ThemeOverrides = NonNullable<ReserveSwapWidgetProps['themeOverrides']>

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
  title: 'Widgets/GoodReserveWidget/Theme overrides',
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
          {`<GoodReserveWidget\n  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}\n/>`}
        </CodeBlock>

        <DocsCallout title="All overridable paths on GoodReserveWidget" tone="info">
          <DocsList>
            <li>
              <strong>dark_Card / light_Card</strong>: background, color, borderColor, shadowColor —
              background and borderColor wired to the controls above; demonstrated below on the
              outer swap shell and the two amount panels, all of which extend the plain Card theme
              with no dedicated preset of their own
            </li>
            <li>
              <strong>dark_Button / light_Button</strong>: background, backgroundHover,
              backgroundPress, backgroundFocus, color, borderColor, borderColorFocus, shadowColor —
              background, backgroundHover, and color wired to the controls above; demonstrated below
              on the primary CTA button
            </li>
            <li>
              <strong>
                dark_ReserveSwapShell / dark_ReserveAmountCard / dark_ReserveSurface / etc.
              </strong>
              : no dedicated preset exists for any named ReserveSwapView target (confirmed via
              packages/ui/src/presets.ts), so they already cascade from Card/Button above — no
              separate named-target controls are needed to reach them
            </li>
          </DocsList>
        </DocsCallout>

        <DocsCallout title="Why two columns" tone="info">
          Each surface renders once in dark and once in light so every wired `light_*` control has a
          visibly-exercised counterpart, not just a paired value that happens to exist.
        </DocsCallout>

        <div>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>
            Idle-buy state — outer swap card, amount panels, and primary CTA button together
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <GoodReserveWidget
              provider={provider}
              mockState={reserveWidgetMockStates.idleBuy}
              defaultTheme="dark"
              themeOverrides={themeOverrides}
            />
            <GoodReserveWidget
              provider={provider}
              mockState={reserveWidgetMockStates.idleBuy}
              defaultTheme="light"
              themeOverrides={themeOverrides}
            />
          </div>
        </div>
      </div>
    )
  },
}
