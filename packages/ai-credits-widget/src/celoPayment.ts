import {
  encodeAbiParameters,
  parseAbi,
  parseUnits,
  type Address,
  type PublicClient,
  type WalletClient,
} from 'viem'

export const G_TOKEN_CELO_ADDRESS: Address = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A'

export const CFA_V1_FORWARDER_ADDRESS: Address = '0xcfA132E353cB4E398080B9700609bb008eceB125'

const SECONDS_PER_MONTH = 30n * 24n * 3600n

const G_TOKEN_ABI = parseAbi([
  'function transferAndCall(address to, uint256 value, bytes data) returns (bool)',
])

const CFA_FORWARDER_ABI = parseAbi([
  'function createFlow(address token, address sender, address receiver, int96 flowrate, bytes userData) returns (bool)',
  'function updateFlow(address token, address sender, address receiver, int96 flowrate, bytes userData) returns (bool)',
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
  depositAmountG: number
  streamAmountG: number
}

export interface CeloPaymentResult {
  txHashes: `0x${string}`[]
}

function monthlyToFlowRate(monthlyAmountG: number): bigint {
  const monthlyWei = parseUnits(monthlyAmountG.toString(), 18)
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
  streamAmountG: number,
): Promise<`0x${string}`[]> {
  const flowRatePerSecond = monthlyToFlowRate(streamAmountG)
  if (flowRatePerSecond <= 0n) {
    throw new Error('Stream amount must be greater than zero')
  }

  const userData = encodeBuyerUserData(buyer)
  const txHashes: `0x${string}`[] = []

  const flowInfo = (await publicClient.readContract({
    address: CFA_V1_FORWARDER_ADDRESS,
    abi: CFA_FORWARDER_ABI,
    functionName: 'getFlowInfo',
    args: [G_TOKEN_CELO_ADDRESS, payer, vault],
  })) as readonly [bigint, bigint, bigint, bigint]
  const existingFlowRate = flowInfo[1]
  const flowFunction = existingFlowRate > 0n ? 'updateFlow' : 'createFlow'

  const flowTx = await walletClient.writeContract({
    account: payer,
    chain: CELO_CHAIN,
    address: CFA_V1_FORWARDER_ADDRESS,
    abi: CFA_FORWARDER_ABI,
    functionName: flowFunction,
    args: [G_TOKEN_CELO_ADDRESS, payer, vault, flowRatePerSecond, userData],
  })
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
  depositAmountG: number,
): Promise<`0x${string}`> {
  const depositWei = parseUnits(depositAmountG.toString(), 18)
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
  const { walletClient, publicClient, payer, buyer, vault, depositAmountG, streamAmountG } = params
  const hasDeposit = depositAmountG > 0
  const hasStream = streamAmountG > 0

  if (!hasDeposit && !hasStream) {
    throw new Error('At least one of deposit or stream amount must be greater than zero')
  }

  const txHashes: `0x${string}`[] = []

  if (hasStream) {
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
