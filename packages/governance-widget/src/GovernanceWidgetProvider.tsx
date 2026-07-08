import { useMemo } from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import { YStack } from '@goodwidget/ui'

import type { GovernanceWidgetProviderProps } from './types'
import { createGovernanceWidgetConfig } from './config'

/**
 * Builds the governance author configuration before host theme overrides are
 * applied by GoodWidgetProvider.
 *
 * Governance component-level theme definitions are kept local to this package
 * and merged here at the author config layer. Integrators can still override
 * them through the themeOverrides prop.
 */

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
      <YStack padding="$4" width="100%">
        {children}
      </YStack>
    </GoodWidgetProvider>
  )
}
