import type { EIP1193Provider } from './eip1193'
import type { HostEnvironment, HostCapabilities, HostDetectionResult } from './types'

interface WindowWithProviders {
  ethereum?: EIP1193Provider & {
    isMiniPay?: boolean
    isGoodWidgetBridge?: boolean
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
  goodWidget?: {
    provider?: EIP1193Provider
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

async function detectFarcaster(win: WindowWithProviders): Promise<HostDetectionResult | null> {
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

function detectGoodWidgetBridge(win: WindowWithProviders): HostDetectionResult | null {
  const provider =
    win.goodWidget?.provider ?? (win.ethereum?.isGoodWidgetBridge ? win.ethereum : undefined)
  if (!provider) return null

  return {
    host: 'goodwidget-bridge' as HostEnvironment,
    provider,
    capabilities: { ...DEFAULT_CAPABILITIES },
  }
}

async function detectEIP6963(): Promise<HostDetectionResult | null> {
  if (typeof window === 'undefined') return null

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', handler as EventListener)
      resolve(null)
    }, 1000)

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ info: { rdns: string }; provider: EIP1193Provider }>)
        .detail
      if (!detail?.provider) return

      if (detail.info.rdns === 'org.gooddollar.goodwidget.bridge') {
        clearTimeout(timer)
        window.removeEventListener('eip6963:announceProvider', handler as EventListener)
        resolve({
          host: 'goodwidget-bridge' as HostEnvironment,
          provider: detail.provider,
          capabilities: { ...DEFAULT_CAPABILITIES },
        })
      }
    }

    window.addEventListener('eip6963:announceProvider', handler as EventListener)
    window.dispatchEvent(new Event('eip6963:requestProvider'))
  })
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
 *
 * Bridge always wins — if a bridge provider is already established
 * (e.g. from enableIframeBridge() or auto-bridge in GoodWidgetProvider),
 * it takes priority over everything including the explicit provider prop.
 *
 * Priority:
 * 1. GoodWidget bridge globals (window.goodWidget.provider / isGoodWidgetBridge)
 * 2. EIP-6963 discovered bridge provider
 * 3. Explicit provider prop
 * 4. Farcaster SDK
 * 5. World App MiniKit
 * 6. MiniPay (Celo)
 * 7. Generic injected (window.ethereum)
 */
export async function detectHost(
  explicitProvider?: EIP1193Provider,
): Promise<HostDetectionResult | null> {
  const win = getWindow()

  if (win) {
    const bridge = detectGoodWidgetBridge(win)
    if (bridge) return bridge

    const eip6963 = await detectEIP6963()
    if (eip6963) return eip6963
  }

  if (explicitProvider) {
    return {
      host: 'custom',
      provider: explicitProvider,
      capabilities: { ...DEFAULT_CAPABILITIES },
    }
  }

  if (!win) return null

  const farcaster = await detectFarcaster(win)
  if (farcaster) return farcaster

  const worldApp = detectWorldApp(win)
  if (worldApp) return worldApp

  const miniPay = detectMiniPay(win)
  if (miniPay) return miniPay

  return detectInjected(win)
}
