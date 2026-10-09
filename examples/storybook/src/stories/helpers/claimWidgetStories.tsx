import React from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import { ClaimWidget } from '@goodwidget/claim-widget-theme-demo'
import { MiniAppShell, YStack } from '@goodwidget/ui'
import { createMockEip1193Provider } from '../../fixtures/mockEip1193'

export const mockProvider = createMockEip1193Provider()

export { cobaltOverrides, tealOverrides } from './themeOverridePresets'

interface ClaimWidgetStoryCanvasProps {
  config?: React.ComponentProps<typeof ClaimWidget>['config']
  dataTestId: string
  defaultTheme?: 'light' | 'dark'
  themeOverrides?: React.ComponentProps<typeof ClaimWidget>['themeOverrides']
}

export function ClaimWidgetStoryCanvas({
  config,
  dataTestId,
  defaultTheme = 'dark',
  themeOverrides,
}: ClaimWidgetStoryCanvasProps) {
  return (
    <GoodWidgetProvider defaultTheme={defaultTheme}>
      <MiniAppShell>
        <YStack data-testid={dataTestId} style={{ width: 380 }}>
          <ClaimWidget
            config={config}
            provider={mockProvider}
            defaultTheme={defaultTheme}
            themeOverrides={themeOverrides}
          />
        </YStack>
      </MiniAppShell>
    </GoodWidgetProvider>
  )
}
