import {
  encodeAbiParameters,
  parseAbi,
  type Address,
  type PublicClient,
  type WalletClient,
} from 'viem'
import { gToWei } from './quoteMath'

export const G_TOKEN_CELO_ADDRESS: Address = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A'

export const CFA_V1_FORWARDER_ADDRESS: Address = '0xcfA132E353cB4E398080B9700609bb008eceB125'

const SECONDS_PER_MONTH = 30n * 24n * 3600n

const G_TOKEN_ABI = parseAbi([
  'function transferAndCall(address to, uint256 value, bytes data) returns (bool)',
])

const CFA_FORWARDER_ABI = parseAbi([
  'function createFlow(address token, address sender, address receiver, int96 flowrate, bytes userData) returns (bool)',
  'function updateFlow(address token, address sender, address receiver, int96 flowrate, bytes userData) returns (bool)',
  'function deleteFlow(address token, address sender, address receiver, bytes userData) returns (bool)',
  'function getFlowInfo(address token, address sender, address receiver) view returns (uint256 lastUpdated, int96 flowrate, uint256 deposit, uint256 owedDeposit)',
])

const CELO_CHAIN = {
  id: 42220,
  name: 'Celo',
  nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
  rpcUrls: { default: { http: ['https://forno.celo.org'] } },
} as const

export interface CeloPaymentParams {
  walletClient: WalletClient
  publicClient: PublicClient
  payer: Address
  buyer: Address
  vault: Address
  depositAmountG: string
  streamAmountG: string
  currentStreamAmountG: string | null
}

export interface CeloPaymentResult {
  txHashes: `0x${string}`[]
}

export function isStreamAmountChanged(
  streamAmountG: string,
  currentStreamAmountG: string | null | undefined,
): boolean {
  return gToWei(streamAmountG) !== gToWei(currentStreamAmountG ?? '0')
}

function monthlyToFlowRate(monthlyAmountG: string): bigint {
  const monthlyWei = gToWei(monthlyAmountG)
  if (monthlyWei <= 0n) return 0n
  return monthlyWei / SECONDS_PER_MONTH
}

function encodeBuyerUserData(buyer: Address): `0x${string}` {
  return encodeAbiParameters([{ type: 'address' }], [buyer])
}

async function submitStreamSetup(
  walletClient: WalletClient,
  publicClient: PublicClient,
  payer: Address,
  buyer: Address,
  vault: Address,
  streamAmountG: string,
): Promise<`0x${string}`[]> {
  const flowRatePerSecond = monthlyToFlowRate(streamAmountG)
  const userData = encodeBuyerUserData(buyer)
  const txHashes: `0x${string}`[] = []

  const flowInfo = (await publicClient.readContract({
    address: CFA_V1_FORWARDER_ADDRESS,
    abi: CFA_FORWARDER_ABI,
    functionName: 'getFlowInfo',
    args: [G_TOKEN_CELO_ADDRESS, payer, vault],
  })) as readonly [bigint, bigint, bigint, bigint]
  const existingFlowRate = flowInfo[1]

  let flowTx: `0x${string}`
  if (flowRatePerSecond <= 0n) {
    if (existingFlowRate <= 0n) {
      throw new Error('No existing stream to cancel')
    }
    flowTx = await walletClient.writeContract({
      account: payer,
      chain: CELO_CHAIN,
      address: CFA_V1_FORWARDER_ADDRESS,
      abi: CFA_FORWARDER_ABI,
      functionName: 'deleteFlow',
      args: [G_TOKEN_CELO_ADDRESS, payer, vault, userData],
    })
  } else {
    const flowFunction = existingFlowRate > 0n ? 'updateFlow' : 'createFlow'
    flowTx = await walletClient.writeContract({
      account: payer,
      chain: CELO_CHAIN,
      address: CFA_V1_FORWARDER_ADDRESS,
      abi: CFA_FORWARDER_ABI,
      functionName: flowFunction,
      args: [G_TOKEN_CELO_ADDRESS, payer, vault, flowRatePerSecond, userData],
    })
  }

  await waitForMinedTransaction(publicClient, flowTx)
  txHashes.push(flowTx)

  return txHashes
}

async function submitOneTimeDeposit(
  walletClient: WalletClient,
  publicClient: PublicClient,
  payer: Address,
  vault: Address,
  buyer: Address,
  depositAmountG: string,
): Promise<`0x${string}`> {
  const depositWei = gToWei(depositAmountG)
  if (depositWei <= 0n) {
    throw new Error('Deposit amount must be greater than zero')
  }
  const userData = encodeBuyerUserData(buyer)

  const txHash = await walletClient.writeContract({
    account: payer,
    chain: CELO_CHAIN,
    address: G_TOKEN_CELO_ADDRESS,
    abi: G_TOKEN_ABI,
    functionName: 'transferAndCall',
    args: [vault, depositWei, userData],
  })
  await waitForMinedTransaction(publicClient, txHash)
  return txHash
}

async function waitForMinedTransaction(
  publicClient: PublicClient,
  hash: `0x${string}`,
): Promise<void> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status === 'reverted') {
    throw new Error(`Celo transaction reverted: ${hash}`)
  }
}

export async function executeCeloPayment(params: CeloPaymentParams): Promise<CeloPaymentResult> {
  const {
    walletClient,
    publicClient,
    payer,
    buyer,
    vault,
    depositAmountG,
    streamAmountG,
    currentStreamAmountG,
  } = params
  const hasDeposit = gToWei(depositAmountG) > 0n
  const streamChanged = isStreamAmountChanged(streamAmountG, currentStreamAmountG)

  if (!hasDeposit && !streamChanged) {
    throw new Error('Enter a deposit or change the monthly stream amount')
  }

  const txHashes: `0x${string}`[] = []

  if (streamChanged) {
    const streamTxHashes = await submitStreamSetup(
      walletClient,
      publicClient,
      payer,
      buyer,
      vault,
      streamAmountG,
    )
    txHashes.push(...streamTxHashes)
  }

  if (hasDeposit) {
    txHashes.push(
      await submitOneTimeDeposit(walletClient, publicClient, payer, vault, buyer, depositAmountG),
    )
  }

  return { txHashes }
}
