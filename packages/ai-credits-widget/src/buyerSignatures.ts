import { privateKeyToAccount } from 'viem/accounts'
import type { Address, Hex } from 'viem'
import { BASE_CHAIN_ID } from './chainClient'

export const ANTSEED_BUYER_OPERATOR_DOMAIN = {
  name: 'AntseedBuyerOperator',
  version: '1',
} as const

const WITHDRAW_PRINCIPAL_TYPES = {
  WithdrawPrincipal: [
    { name: 'buyer', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'recipient', type: 'address' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const

const REQUEST_CLOSE_TYPES = {
  RequestClose: [
    { name: 'channelId', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const

const REVOKE_OPERATOR_TYPES = {
  RevokeOperator: [
    { name: 'buyer', type: 'address' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const

export function normalizeChannelId(channelId: string): Hex | null {
  const trimmed = channelId.trim()
  if (!/^0x[0-9a-fA-F]{64}$/.test(trimmed)) return null
  return trimmed.toLowerCase() as Hex
}

export async function signWithdrawPrincipal(params: {
  buyerPrivateKey: Hex
  fundingVaultAddress: Address
  buyer: Address
  amountMicro: bigint
  recipient: Address
  nonce: bigint
}): Promise<Hex> {
  const account = privateKeyToAccount(params.buyerPrivateKey)
  return account.signTypedData({
    domain: {
      name: ANTSEED_BUYER_OPERATOR_DOMAIN.name,
      version: ANTSEED_BUYER_OPERATOR_DOMAIN.version,
      chainId: BASE_CHAIN_ID,
      verifyingContract: params.fundingVaultAddress,
    },
    types: WITHDRAW_PRINCIPAL_TYPES,
    primaryType: 'WithdrawPrincipal',
    message: {
      buyer: params.buyer,
      amount: params.amountMicro,
      recipient: params.recipient,
      nonce: params.nonce,
    },
  })
}

export async function signRequestClose(params: {
  buyerPrivateKey: Hex
  fundingVaultAddress: Address
  channelId: Hex
  nonce: bigint
}): Promise<Hex> {
  const account = privateKeyToAccount(params.buyerPrivateKey)
  return account.signTypedData({
    domain: {
      name: ANTSEED_BUYER_OPERATOR_DOMAIN.name,
      version: ANTSEED_BUYER_OPERATOR_DOMAIN.version,
      chainId: BASE_CHAIN_ID,
      verifyingContract: params.fundingVaultAddress,
    },
    types: REQUEST_CLOSE_TYPES,
    primaryType: 'RequestClose',
    message: {
      channelId: params.channelId,
      nonce: params.nonce,
    },
  })
}

export async function signRevokeOperator(params: {
  buyerPrivateKey: Hex
  fundingVaultAddress: Address
  buyer: Address
  nonce: bigint
}): Promise<Hex> {
  const account = privateKeyToAccount(params.buyerPrivateKey)
  return account.signTypedData({
    domain: {
      name: ANTSEED_BUYER_OPERATOR_DOMAIN.name,
      version: ANTSEED_BUYER_OPERATOR_DOMAIN.version,
      chainId: BASE_CHAIN_ID,
      verifyingContract: params.fundingVaultAddress,
    },
    types: REVOKE_OPERATOR_TYPES,
    primaryType: 'RevokeOperator',
    message: {
      buyer: params.buyer,
      nonce: params.nonce,
    },
  })
}
