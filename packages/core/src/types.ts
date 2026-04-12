import type { EIP1193Provider } from './eip1193'
import type { ReactNode } from 'react'
import type { GoodWidgetConfig, GoodWidgetThemeOverrides } from '@goodwidget/ui'

export type HostEnvironment = 'farcaster' | 'minipay' | 'worldapp' | 'injected' | 'custom'

export interface HostCapabilities {
  batchTransactions: boolean
  feeCurrency: boolean
  haptics: boolean
  notifications: boolean
  signin: boolean
}

export interface HostDetectionResult {
  host: HostEnvironment
  provider: EIP1193Provider
  capabilities: HostCapabilities
}

export interface WalletState {
  address: string | null
  chainId: number | null
  isConnected: boolean
  provider: EIP1193Provider | null
}

export interface HostState {
  host: HostEnvironment
  capabilities: HostCapabilities
}

export interface GoodWidgetState extends WalletState {
  host: HostEnvironment
  capabilities: HostCapabilities
}

export interface GoodWidgetProviderProps {
  provider?: EIP1193Provider
  config?: GoodWidgetConfig
  themeOverrides?: GoodWidgetThemeOverrides
  defaultTheme?: 'light' | 'dark'
  children: ReactNode
}
