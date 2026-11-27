import React from 'react'
import type { Meta } from '@storybook/react'
import type { GoodWidgetThemeOverrides } from '@goodwidget/core'
import { DocsCallout } from '../docs/DocsLayout'

export interface ButtonThemeArgs {
  defaultTheme: 'dark' | 'light'
  darkButtonBackground: string
  lightButtonBackground: string
}

export const buttonThemeControls = {
  tags: ['integrator', 'showcase'],
  parameters: { layout: 'padded' },
  args: {
    defaultTheme: 'dark',
    darkButtonBackground: '#5B21B6',
    lightButtonBackground: '#1D4ED8',
  },
  argTypes: {
    defaultTheme: { control: 'radio', options: ['dark', 'light'] },
    darkButtonBackground: { control: 'color', description: 'themes.dark_Button.background' },
    lightButtonBackground: { control: 'color', description: 'themes.light_Button.background' },
  },
} satisfies Omit<Meta<ButtonThemeArgs>, 'title'>

export function ButtonThemePlayground({
  widgetName,
  args,
  renderWidget,
}: {
  widgetName: string
  args: ButtonThemeArgs
  renderWidget: (overrides: GoodWidgetThemeOverrides) => React.ReactNode
}) {
  const themeOverrides: GoodWidgetThemeOverrides = {
    themes: {
      dark_Button: { background: args.darkButtonBackground },
      light_Button: { background: args.lightButtonBackground },
    },
  }
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 560, margin: '0 auto' }}>
      <DocsCallout title="Button theme overrides" tone="info">
        Choose light or dark mode, then change its button background. The demo uses a mock
        adapter and does not connect to a wallet.
      </DocsCallout>
      <pre style={{ overflowX: 'auto' }}>
        {`<${widgetName} defaultTheme="${args.defaultTheme}"
  themeOverrides={${JSON.stringify(themeOverrides, null, 2)}}
/>`}
      </pre>
      {renderWidget(themeOverrides)}
    </div>
  )
}
