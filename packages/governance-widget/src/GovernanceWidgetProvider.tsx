import { useMemo } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
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

function mergeThemeMaps(
  base: GoodWidgetConfig['themes'],
  override: GoodWidgetConfig['themes'],
): GoodWidgetConfig['themes'] {
  if (!base && !override) return undefined

  const merged: NonNullable<GoodWidgetConfig['themes']> = { ...(base ?? {}) }

  for (const [name, values] of Object.entries(override ?? {})) {
    merged[name] = { ...(merged[name] ?? {}), ...values }
  }

  return merged
}

/**
 * Builds the governance author configuration before host theme overrides are
 * applied by GoodWidgetProvider.
 */
function createGovernanceWidgetConfig(config?: GoodWidgetConfig): GoodWidgetConfig {
  return {
    preset: config?.preset,
    tokens: config?.tokens,
    themes: mergeThemeMaps(governanceWidgetConfig.themes, config?.themes),
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
