import {
  encodeAbiParameters,
  parseAbi,
  parseUnits,
  type Address,
  type PublicClient,
  type WalletClient,
} from 'viem'

export const G_TOKEN_CELO_ADDRESS: Address = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A'

export const SUPERFLUID_HOST_ADDRESS: Address = '0xA4Ff07cF81C02CFD356184879D953970cA957585'

export const CFA_V1_CELO_ADDRESS: Address = '0x511CBa3De92dB7891967e21Dbd7C4571531ab84B'

export const CFA_V1_FORWARDER_ADDRESS: Address = '0xcfA132E353cB4E398080B9700609bb008eceB125'

const SECONDS_PER_MONTH = 30n * 24n * 3600n
const MAX_UINT256 = 2n ** 256n - 1n

const G_TOKEN_ABI = parseAbi([
  'function increaseAllowance(address spender, uint256 addedValue) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transferAndCall(address to, uint256 value, bytes data) returns (bool)',
])

const CFA_FORWARDER_ABI = parseAbi([
  'function createFlow(address token, address sender, address receiver, int96 flowrate, bytes userData) returns (bool)',
  'function updateFlow(address token, address sender, address receiver, int96 flowrate, bytes userData) returns (bool)',
  'function getFlowInfo(address token, address sender, address receiver) view returns (uint256 lastUpdated, int96 flowrate, uint256 deposit, uint256 owedDeposit)',
  'function getBufferAmountByFlowrate(address token, int96 flowrate) view returns (uint256 bufferAmount)',
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

  const requiredAllowance = (await publicClient.readContract({
    address: CFA_V1_FORWARDER_ADDRESS,
    abi: CFA_FORWARDER_ABI,
    functionName: 'getBufferAmountByFlowrate',
    args: [G_TOKEN_CELO_ADDRESS, flowRatePerSecond],
  })) as bigint

  const existingCfaAllowance = (await publicClient.readContract({
    address: G_TOKEN_CELO_ADDRESS,
    abi: G_TOKEN_ABI,
    functionName: 'allowance',
    args: [payer, CFA_V1_CELO_ADDRESS],
  })) as bigint

  if (existingCfaAllowance < requiredAllowance) {
    const allowanceTx = await walletClient.writeContract({
      account: payer,
      chain: CELO_CHAIN,
      address: G_TOKEN_CELO_ADDRESS,
      abi: G_TOKEN_ABI,
      functionName: 'increaseAllowance',
      args: [CFA_V1_CELO_ADDRESS, MAX_UINT256 - existingCfaAllowance],
    })
    txHashes.push(allowanceTx)
  }

  const flowTx = await walletClient.writeContract({
    account: payer,
    chain: CELO_CHAIN,
    address: CFA_V1_FORWARDER_ADDRESS,
    abi: CFA_FORWARDER_ABI,
    functionName: flowFunction,
    args: [G_TOKEN_CELO_ADDRESS, payer, vault, flowRatePerSecond, userData],
  })
  txHashes.push(flowTx)

  return txHashes
}

async function submitOneTimeDeposit(
  walletClient: WalletClient,
  payer: Address,
  vault: Address,
  buyer: Address,
  depositAmountG: number,
): Promise<`0x${string}`> {
  const depositWei = parseUnits(depositAmountG.toString(), 18)
  const userData = encodeBuyerUserData(buyer)

  return walletClient.writeContract({
    account: payer,
    chain: CELO_CHAIN,
    address: G_TOKEN_CELO_ADDRESS,
    abi: G_TOKEN_ABI,
    functionName: 'transferAndCall',
    args: [vault, depositWei, userData],
  })
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
      await submitOneTimeDeposit(walletClient, payer, vault, buyer, depositAmountG),
    )
  }

  return { txHashes }
}
