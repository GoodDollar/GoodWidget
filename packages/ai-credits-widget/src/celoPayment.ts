import {
  encodeAbiParameters,
  encodeFunctionData,
  parseAbi,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from 'viem'
import { gToWei } from './quoteMath'

export const G_TOKEN_CELO_ADDRESS: Address = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A'

export const CFA_V1_FORWARDER_ADDRESS: Address = '0xcfA132E353cB4E398080B9700609bb008eceB125'

export const CFA_V1_ADDRESS: Address = '0x9d369e78e1a682cE0F8d9aD849BeA4FE1c3bD3Ad'

export const SUPERFLUID_HOST_CELO_ADDRESS: Address = '0xA4Ff07cF81C02CFD356184879D953970cA957585'

const OPERATION_TYPE_ERC20_APPROVE = 1
const OPERATION_TYPE_SUPERFLUID_CALL_AGREEMENT = 201
const OPERATION_TYPE_CALL_APP_ACTION = 202

const SECONDS_PER_MONTH = 30n * 24n * 3600n

const CFA_FORWARDER_ABI = parseAbi([
  'function getFlowInfo(address token, address sender, address receiver) view returns (uint256 lastUpdated, int96 flowrate, uint256 deposit, uint256 owedDeposit)',
])

const CFA_ABI = parseAbi([
  'function createFlow(address token, address receiver, int96 flowRate, bytes ctx) returns (bytes newCtx)',
  'function updateFlow(address token, address receiver, int96 flowRate, bytes ctx) returns (bytes newCtx)',
  'function deleteFlow(address token, address sender, address receiver, bytes ctx) returns (bytes newCtx)',
])

const VAULT_ABI = parseAbi([
  'function depositFromAction(uint256 amount, bytes data, bytes ctx) returns (bytes newCtx)',
])

const HOST_ABI = parseAbi([
  'function batchCall((uint32 operationType, address target, bytes data)[] operations) payable',
])

const CELO_CHAIN = {
  id: 42220,
  name: 'Celo',
  nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
  rpcUrls: { default: { http: ['https://forno.celo.org'] } },
} as const

type BatchOperation = {
  operationType: number
  target: Address
  data: Hex
}

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

function encodeBuyerUserData(buyer: Address): Hex {
  return encodeAbiParameters([{ type: 'address' }], [buyer])
}

function buildApproveOperation(vault: Address, depositWei: bigint): BatchOperation {
  return {
    operationType: OPERATION_TYPE_ERC20_APPROVE,
    target: G_TOKEN_CELO_ADDRESS,
    data: encodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], [vault, depositWei]),
  }
}

function buildDepositFromActionOperation(
  vault: Address,
  buyer: Address,
  depositWei: bigint,
): BatchOperation {
  const callData = encodeFunctionData({
    abi: VAULT_ABI,
    functionName: 'depositFromAction',
    args: [depositWei, encodeBuyerUserData(buyer), '0x'],
  })
  return {
    operationType: OPERATION_TYPE_CALL_APP_ACTION,
    target: vault,
    data: callData,
  }
}

async function buildStreamOperation(
  publicClient: PublicClient,
  payer: Address,
  buyer: Address,
  vault: Address,
  streamAmountG: string,
): Promise<BatchOperation> {
  const flowRatePerSecond = monthlyToFlowRate(streamAmountG)
  const userData = encodeBuyerUserData(buyer)
  const flowInfo = (await publicClient.readContract({
    address: CFA_V1_FORWARDER_ADDRESS,
    abi: CFA_FORWARDER_ABI,
    functionName: 'getFlowInfo',
    args: [G_TOKEN_CELO_ADDRESS, payer, vault],
  })) as readonly [bigint, bigint, bigint, bigint]
  const existingFlowRate = flowInfo[1]

  let callData: Hex
  if (flowRatePerSecond <= 0n) {
    if (existingFlowRate <= 0n) {
      throw new Error('No existing stream to cancel')
    }
    callData = encodeFunctionData({
      abi: CFA_ABI,
      functionName: 'deleteFlow',
      args: [G_TOKEN_CELO_ADDRESS, payer, vault, '0x'],
    })
  } else if (existingFlowRate > 0n) {
    callData = encodeFunctionData({
      abi: CFA_ABI,
      functionName: 'updateFlow',
      args: [G_TOKEN_CELO_ADDRESS, vault, flowRatePerSecond, '0x'],
    })
  } else {
    callData = encodeFunctionData({
      abi: CFA_ABI,
      functionName: 'createFlow',
      args: [G_TOKEN_CELO_ADDRESS, vault, flowRatePerSecond, '0x'],
    })
  }

  return {
    operationType: OPERATION_TYPE_SUPERFLUID_CALL_AGREEMENT,
    target: CFA_V1_ADDRESS,
    data: encodeAbiParameters([{ type: 'bytes' }, { type: 'bytes' }], [callData, userData]),
  }
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
  const depositWei = gToWei(depositAmountG)
  const hasDeposit = depositWei > 0n
  const streamChanged = isStreamAmountChanged(streamAmountG, currentStreamAmountG)

  if (!hasDeposit && !streamChanged) {
    throw new Error('Enter a deposit or change the monthly stream amount')
  }

  const operations: BatchOperation[] = []

  if (hasDeposit) {
    operations.push(buildApproveOperation(vault, depositWei))
  }

  if (streamChanged) {
    operations.push(await buildStreamOperation(publicClient, payer, buyer, vault, streamAmountG))
  }

  if (hasDeposit) {
    operations.push(buildDepositFromActionOperation(vault, buyer, depositWei))
  }

  const txHash = await walletClient.writeContract({
    account: payer,
    chain: CELO_CHAIN,
    address: SUPERFLUID_HOST_CELO_ADDRESS,
    abi: HOST_ABI,
    functionName: 'batchCall',
    args: [operations],
  })
  await waitForMinedTransaction(publicClient, txHash)

  return { txHashes: [txHash] }
}
