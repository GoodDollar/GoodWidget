import type { EIP1193Provider } from './eip1193'
import type { HostEnvironment, HostCapabilities, HostDetectionResult } from './types'

interface WindowWithProviders {
  ethereum?: EIP1193Provider & {
    isMiniPay?: boolean
  }
  farcaster?: {
    sdk?: {
      wallet?: {
        getEthereumProvider(): Promise<EIP1193Provider>
      }
    }
  }
  MiniKit?: {
    isInWorldApp(): boolean
  }
}

function getWindow(): WindowWithProviders | undefined {
  if (typeof window !== 'undefined') {
    return window as unknown as WindowWithProviders
  }
  return undefined
}

const DEFAULT_CAPABILITIES: HostCapabilities = {
  batchTransactions: false,
  feeCurrency: false,
  haptics: false,
  notifications: false,
  signin: false,
}

async function detectFarcaster(
  win: WindowWithProviders,
): Promise<HostDetectionResult | null> {
  if (!win.farcaster?.sdk?.wallet) return null

  try {
    const provider = await win.farcaster.sdk.wallet.getEthereumProvider()
    return {
      host: 'farcaster',
      provider,
      capabilities: {
        ...DEFAULT_CAPABILITIES,
        batchTransactions: true,
        haptics: true,
        notifications: true,
        signin: true,
      },
    }
  } catch {
    return null
  }
}

function detectWorldApp(win: WindowWithProviders): HostDetectionResult | null {
  if (!win.MiniKit?.isInWorldApp()) return null

  // World App provider is obtained via wagmi connector or MiniKit APIs;
  // fall back to injected provider for EIP-1193 compatibility
  const provider = win.ethereum
  if (!provider) return null

  return {
    host: 'worldapp',
    provider,
    capabilities: {
      ...DEFAULT_CAPABILITIES,
      haptics: true,
      notifications: true,
      signin: true,
    },
  }
}

function detectMiniPay(win: WindowWithProviders): HostDetectionResult | null {
  if (!win.ethereum?.isMiniPay) return null

  return {
    host: 'minipay',
    provider: win.ethereum,
    capabilities: {
      ...DEFAULT_CAPABILITIES,
      feeCurrency: true,
    },
  }
}

function detectInjected(win: WindowWithProviders): HostDetectionResult | null {
  if (!win.ethereum) return null

  return {
    host: 'injected',
    provider: win.ethereum,
    capabilities: { ...DEFAULT_CAPABILITIES },
  }
}

/**
 * Detect the host environment and resolve the EIP-1193 provider.
 * If an explicit provider is passed, it takes highest priority and the host is 'custom'.
 */
export async function detectHost(
  explicitProvider?: EIP1193Provider,
): Promise<HostDetectionResult | null> {
  if (explicitProvider) {
    return {
      host: 'custom',
      provider: explicitProvider,
      capabilities: { ...DEFAULT_CAPABILITIES },
    }
  }

  const win = getWindow()
  if (!win) return null

  // Priority: Farcaster > World App > MiniPay > generic injected
  const farcaster = await detectFarcaster(win)
  if (farcaster) return farcaster

  const worldApp = detectWorldApp(win)
  if (worldApp) return worldApp

  const miniPay = detectMiniPay(win)
  if (miniPay) return miniPay

  return detectInjected(win)
}
