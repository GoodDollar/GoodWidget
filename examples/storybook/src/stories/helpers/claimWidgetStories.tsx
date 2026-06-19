import React from 'react'
import { GoodWidgetProvider } from '@goodwidget/core'
import { ClaimWidget } from '@goodwidget/claim-widget-theme-demo'
import { MiniAppShell, YStack } from '@goodwidget/ui'
import { createMockEip1193Provider } from '../../fixtures/mockEip1193'

export const mockProvider = createMockEip1193Provider()

export const cobaltOverrides = {
  tokens: {
    color: {
      primary: '#2E5DE8',
      primaryDark: '#1D3EB2',
      primaryLight: '#6E8DFF',
    },
  },
  themes: {
    dark_ClaimCard: { borderColor: '#2E5DE8', shadowColor: 'rgba(46,93,232,0.7)' },
    dark_ClaimActionGlow: { primary: '#4F7DFF', primaryLight: '#9DB4FF' },
    dark_ClaimActionRing: { primary: '#2E5DE8', primaryLight: '#6E8DFF' },
    dark_ClaimActionInner: { backgroundDark: '#0E1A3A', backgroundDarkHover: '#172B60' },
    dark_TokenAmountText: { color: '#BBD0FF', secondaryColor: '#7FA2FF' },
  },
}

export const tealOverrides = {
  tokens: {
    color: {
      primary: '#00A884',
      primaryDark: '#007A61',
      primaryLight: '#33C9AA',
    },
  },
  themes: {
    dark_ClaimCard: { borderColor: '#00A884', shadowColor: 'rgba(0,168,132,0.65)' },
    dark_ClaimActionGlow: { primary: '#33C9AA', primaryLight: '#78E0CB' },
    dark_ClaimActionRing: { primary: '#00A884', primaryLight: '#33C9AA' },
    dark_ClaimActionInner: { backgroundDark: '#062A23', backgroundDarkHover: '#0B3B31' },
    dark_TokenAmountText: { color: '#BFF5E7', secondaryColor: '#66D5BB' },
  },
}

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
