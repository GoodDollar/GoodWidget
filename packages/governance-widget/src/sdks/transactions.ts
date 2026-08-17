import type { Address, Hex, PublicClient, WalletClient } from 'viem'
import type { GovernanceHouse, GovernanceProfileDraft } from '../types'
import {
  CELO_CHAIN,
  G_TOKEN_ABI,
  GOODDAO_HOUSES_ABI,
  encodeGovernanceRegistrationData,
  waitForSuccessfulReceipt,
  type GovernanceContractAddresses,
} from './contracts'

export type GovernanceTransactionStage = 'wallet_confirmation' | 'submitted' | 'confirmed'

export async function registerWithTransferAndCall(params: {
  publicClient: PublicClient
  walletClient: WalletClient
  account: Address
  addresses: GovernanceContractAddresses & { houses: Address }
  selectedHouse: GovernanceHouse
  profileDraft: GovernanceProfileDraft
  stakeAmountWei: bigint
  onStage?: (stage: GovernanceTransactionStage, hash?: Hex) => void
}): Promise<Hex> {
  params.onStage?.('wallet_confirmation')
  const registrationData = encodeGovernanceRegistrationData(params.selectedHouse, params.profileDraft)
  const hash = await params.walletClient.writeContract({
    account: params.account,
    chain: CELO_CHAIN,
    address: params.addresses.gToken,
    abi: G_TOKEN_ABI,
    functionName: 'transferAndCall',
    args: [params.addresses.houses, params.stakeAmountWei, registrationData],
  })
  params.onStage?.('submitted', hash)
  await waitForSuccessfulReceipt(params.publicClient, hash)
  params.onStage?.('confirmed', hash)
  return hash
}

export async function unstakeGovernanceMembership(params: {
  publicClient: PublicClient
  walletClient: WalletClient
  account: Address
  housesAddress: Address
  onStage?: (stage: GovernanceTransactionStage, hash?: Hex) => void
}): Promise<Hex> {
  params.onStage?.('wallet_confirmation')
  const hash = await params.walletClient.writeContract({
    account: params.account,
    chain: CELO_CHAIN,
    address: params.housesAddress,
    abi: GOODDAO_HOUSES_ABI,
    functionName: 'unstake',
  })
  params.onStage?.('submitted', hash)
  await waitForSuccessfulReceipt(params.publicClient, hash)
  params.onStage?.('confirmed', hash)
  return hash
}

export async function castGovernanceVote(params: {
  publicClient: PublicClient
  walletClient: WalletClient
  account: Address
  housesAddress: Address
  recipients: Address[]
  allocationsBps: bigint[]
  onStage?: (stage: GovernanceTransactionStage, hash?: Hex) => void
}): Promise<Hex> {
  params.onStage?.('wallet_confirmation')
  const hash = await params.walletClient.writeContract({
    account: params.account,
    chain: CELO_CHAIN,
    address: params.housesAddress,
    abi: GOODDAO_HOUSES_ABI,
    functionName: 'castVote',
    args: [params.recipients, params.allocationsBps],
  })
  params.onStage?.('submitted', hash)
  await waitForSuccessfulReceipt(params.publicClient, hash)
  params.onStage?.('confirmed', hash)
  return hash
}
