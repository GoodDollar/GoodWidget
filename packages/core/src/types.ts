import type { EIP1193Provider } from './eip1193'
import type { ReactNode } from 'react'

export type HostEnvironment = 'farcaster' | 'minipay' | 'worldapp' | 'injected' | 'custom' | 'goodwidget-bridge'

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

export interface GoodWidgetThemeOverrides {
  tokens?: Record<string, Record<string, string | number>>
  themes?: Record<string, Record<string, string | number>>
}

export interface GoodWidgetConfig {
  tokens?: Record<string, Record<string, string | number>>
  themes?: Record<string, Record<string, string | number>>
}

export interface GoodWidgetProviderProps {
  provider?: EIP1193Provider
  config?: GoodWidgetConfig
  themeOverrides?: GoodWidgetThemeOverrides
  defaultTheme?: 'light' | 'dark'
  children: ReactNode
}
