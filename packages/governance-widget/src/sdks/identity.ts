import { IdentitySDK } from '@goodsdks/citizen-sdk'
import type { PublicClient, WalletClient } from 'viem'

export type GovernanceIdentityEnvironment = 'production' | 'staging' | 'development'

export interface GovernanceIdentitySdkInput {
  publicClient: PublicClient
  walletClient: WalletClient
  environment: GovernanceIdentityEnvironment
}

export function createGovernanceIdentitySdk({
  publicClient,
  walletClient,
  environment,
}: GovernanceIdentitySdkInput): IdentitySDK {
  return new IdentitySDK({ publicClient, walletClient, env: environment })
}

export async function createGovernanceIdentityVerificationLink({
  identitySdk,
  returnUrl,
  chainId,
}: {
  identitySdk: IdentitySDK
  returnUrl?: string
  chainId?: number
}): Promise<string> {
  return identitySdk.generateFVLink(false, returnUrl, chainId)
}
