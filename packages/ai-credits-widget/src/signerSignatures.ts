import { privateKeyToAccount } from 'viem/accounts'
import type { Address, Hex } from 'viem'
import { BASE_CHAIN_ID } from './chainClient'

export const ANTSEED_BUYER_OPERATOR_DOMAIN = {
  // Must match AntseedBuyerOperator's DOMAIN_SEPARATOR verbatim. Do not rename
  // with the widget's signer terminology — the contract hashes this string.
  name: 'AntseedBuyerOperator',
  version: '1',
} as const

const REVOKE_OPERATOR_TYPES = {
  RevokeOperator: [
    // `buyer` is the contract's field name; the value is our signer address.
    { name: 'buyer', type: 'address' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const

export async function signRevokeOperator(params: {
  signerPrivateKey: Hex
  fundingVaultAddress: Address
  signer: Address
  nonce: bigint
}): Promise<Hex> {
  const account = privateKeyToAccount(params.signerPrivateKey)
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
      buyer: params.signer,
      nonce: params.nonce,
    },
  })
}
