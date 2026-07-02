import { privateKeyToAccount } from 'viem/accounts'
import type { Address } from 'viem'

export const ANTSEED_DEPOSITS_BASE_ADDRESS =
  '0x0F7a3a8f4Da01637d1202bb5443fcF7F88F99fD2' as const

export type Eip712SigningPayload = {
  primaryType: string
  domain: {
    name: string
    version: string
    chainId: number
    verifyingContract: string
  }
  types: Record<string, Array<{ name: string; type: string }>>
  message: Record<string, string | number>
}

export type BuyerOperatorStatus = {
  enabled: boolean
  account: string
  buyerAddress: string
  operatorAddress?: string
  currentOperator: string
  operatorAccepted: boolean
  consentNonce: string
}

export type OperatorConsentPayloadResponse = {
  enabled: boolean
  account: string
  buyerAddress: string
  typedData?: Eip712SigningPayload
}

export type OperatorAcceptResponse = {
  account: string
  buyerAddress: string
  bridge?: { txHash?: string }
}

export const SET_OPERATOR_TYPES = {
  SetOperator: [
    { name: 'operator', type: 'address' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const

export function buildSetOperatorPayload(
  chainId: number,
  depositsAddress: string,
  operatorAddress: string,
  nonce: bigint,
  domain: { name: string; version: string },
): Eip712SigningPayload {
  return {
    primaryType: 'SetOperator',
    domain: {
      name: domain.name,
      version: domain.version,
      chainId,
      verifyingContract: depositsAddress.toLowerCase(),
    },
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      ...SET_OPERATOR_TYPES,
    },
    message: {
      operator: operatorAddress.toLowerCase(),
      nonce: nonce.toString(),
    },
  }
}

export async function signOperatorConsentFromTypedData(
  buyerPrivateKey: `0x${string}`,
  typedData: Eip712SigningPayload,
): Promise<`0x${string}`> {
  const account = privateKeyToAccount(buyerPrivateKey)
  const types = { ...typedData.types }
  delete types.EIP712Domain
  return account.signTypedData({
    domain: {
      name: typedData.domain.name,
      version: typedData.domain.version,
      chainId: typedData.domain.chainId,
      verifyingContract: typedData.domain.verifyingContract as Address,
    },
    types,
    primaryType: typedData.primaryType,
    message: {
      operator: typedData.message.operator as Address,
      nonce: BigInt(String(typedData.message.nonce)),
    },
  })
}
