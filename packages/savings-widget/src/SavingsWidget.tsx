import React from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider } from '@goodwidget/core'
import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/ui'
import { SavingsInner } from './SavingsInner'

export interface SavingsWidgetProps {
  /**
   * An EIP-1193 provider (e.g. `window.ethereum`).
   * When omitted the widget auto-detects the ambient host provider.
   */
  provider?: EIP1193Provider
  /** Author-level Tamagui config overrides */
  config?: GoodWidgetConfig
  /** Host-level theme overrides (colours, fonts, radii, …) */
  themeOverrides?: GoodWidgetThemeOverrides
  /** Initial colour-scheme. Defaults to `'light'`. */
  defaultTheme?: 'light' | 'dark'
}

/**
 * SavingsWidget — a self-contained GoodDollar savings/staking widget.
 *
 * Wrap it in `GoodWidgetProvider` automatically; pass `provider` to connect
 * a specific EIP-1193 wallet, or let the widget auto-detect the environment.
 *
 * ```tsx
 * <SavingsWidget provider={window.ethereum} defaultTheme="light" />
 * ```
 */
export function SavingsWidget({
  provider,
  config,
  themeOverrides,
  defaultTheme = 'light',
}: SavingsWidgetProps) {
  return (
    <GoodWidgetProvider
      provider={provider}
      config={config}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      <SavingsInner />
    </GoodWidgetProvider>
  )
}
