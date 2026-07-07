import { useMemo } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import { mergeOverrideMaps } from '@goodwidget/ui'
import type {
  EIP1193Provider,
  GoodWidgetConfig,
  GoodWidgetThemeOverrides,
} from '@goodwidget/core'
import type { ReactNode } from 'react'
import { governanceWidgetConfig } from './config'

export interface GovernanceWidgetProviderProps {
  provider?: EIP1193Provider
  config?: GoodWidgetConfig
  themeOverrides?: GoodWidgetThemeOverrides
  defaultTheme?: 'light' | 'dark'
  children: ReactNode
}

/**
 * Builds the governance author configuration before host theme overrides are
 * applied by GoodWidgetProvider.
 *
 * Governance component-level theme definitions are kept local to this package
 * and merged here at the author config layer. Integrators can still override
 * them through the themeOverrides prop.
 */
function createGovernanceWidgetConfig(config?: GoodWidgetConfig): GoodWidgetConfig {
  return {
    preset: config?.preset,
    tokens: config?.tokens,
    themes: mergeOverrideMaps(governanceWidgetConfig.themes, config?.themes),
  }
}

export function GovernanceWidgetProvider({
  provider,
  config,
  themeOverrides,
  defaultTheme = 'light',
  children,
}: GovernanceWidgetProviderProps) {
  const governanceConfig = useMemo(() => createGovernanceWidgetConfig(config), [config])

  return (
    <GoodWidgetProvider
      provider={provider}
      config={governanceConfig}
      themeOverrides={themeOverrides}
      defaultTheme={defaultTheme}
    >
      {children}
    </GoodWidgetProvider>
  )
}
