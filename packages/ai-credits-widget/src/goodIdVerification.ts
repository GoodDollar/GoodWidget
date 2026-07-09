import { IdentitySDK, citizenSdkCapabilities } from '@goodsdks/citizen-sdk'
import type { EIP1193Provider } from '@goodwidget/core'
import { createPublicClient, createWalletClient, custom, type Chain } from 'viem'
import type { AiCreditsWidgetEnvironment } from './widgetRuntimeContract'

const CELO_CHAIN_ID = 42220

const CELO_CHAIN: Chain = {
  id: CELO_CHAIN_ID,
  name: 'Celo',
  nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://forno.celo.org'] },
    public: { http: ['https://forno.celo.org'] },
  },
}

const AVAILABLE_ENVIRONMENTS = citizenSdkCapabilities.environments

export async function startGoodIdVerification(params: {
  provider: EIP1193Provider
  address: string
  chainId: number
  environment?: AiCreditsWidgetEnvironment
  returnUrl?: string
}): Promise<void> {
  if (params.chainId !== CELO_CHAIN_ID) {
    throw new Error('Switch to Celo to verify with GoodID')
  }

  const env =
    params.environment && AVAILABLE_ENVIRONMENTS.includes(params.environment)
      ? params.environment
      : 'production'

  const transport = custom(params.provider as Parameters<typeof custom>[0])
  const publicClient = createPublicClient({ chain: CELO_CHAIN, transport })
  const walletClient = createWalletClient({
    account: params.address as `0x${string}`,
    chain: CELO_CHAIN,
    transport,
  })
  const identitySDK = new IdentitySDK({ publicClient, walletClient, env })
  const returnUrl =
    params.returnUrl ?? (typeof window !== 'undefined' ? window.location.href : '')

  const fvLink = await identitySDK.generateFVLink(false, returnUrl, params.chainId)

  if (typeof window === 'undefined') {
    throw new Error('GoodID verification requires a browser environment')
  }

  window.open(fvLink, '_blank', 'noopener,noreferrer')
}
