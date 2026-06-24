import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import type { Address } from 'viem'

export const ANTSEED_DEPOSITS_EIP712_NAME = 'AntseedDeposits'
export const ANTSEED_DEPOSITS_EIP712_VERSION = '1'

export const SET_OPERATOR_EIP712_TYPES = {
  SetOperator: [
    { name: 'operator', type: 'address' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const

export interface OperatorConsentParams {
  enabled: boolean
  buyer: string
  depositsAddress: string
  operatorAddress: string
  chainId: number
  domainSeparator: string
  nonce: string
  alreadyAccepted: boolean
}

export interface OperatorConsentSubmissionResult {
  accepted: boolean
  alreadyAccepted?: boolean
  txHash?: string
}

export async function signSetOperatorConsent(
  buyerPrivateKey: `0x${string}`,
  params: {
    depositsAddress: Address
    operatorAddress: Address
    chainId: number
    nonce: bigint
  },
): Promise<`0x${string}`> {
  const account: PrivateKeyAccount = privateKeyToAccount(buyerPrivateKey)
  return account.signTypedData({
    domain: {
      name: ANTSEED_DEPOSITS_EIP712_NAME,
      version: ANTSEED_DEPOSITS_EIP712_VERSION,
      chainId: params.chainId,
      verifyingContract: params.depositsAddress,
    },
    types: SET_OPERATOR_EIP712_TYPES,
    primaryType: 'SetOperator',
    message: {
      operator: params.operatorAddress,
      nonce: params.nonce,
    },
  })
}
