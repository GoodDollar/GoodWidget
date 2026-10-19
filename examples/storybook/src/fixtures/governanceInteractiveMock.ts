import { decodeAbiParameters, decodeFunctionData, parseAbi, type Address, type Hex } from 'viem'
import type { EIP1193Provider } from '@goodwidget/core'
import {
  encodeMockGovernanceRead,
  MOCK_ALIGNMENT,
  MOCK_CITIZEN,
  MOCK_G_TOKEN,
  MOCK_GOOD_ID,
  MOCK_HOUSES,
} from './governanceRuntimeMock'

// Minimal write-side ABI fragments, mirroring packages/governance-widget/src/sdks/contracts.ts.
// Duplicated locally (same convention as the read ABI in governanceRuntimeMock.ts) so this
// browser fixture has no dependency on package internals.
const G_TOKEN_WRITE_ABI = parseAbi([
  'function transferAndCall(address to, uint256 value, bytes data) returns (bool)',
])
const HOUSES_WRITE_ABI = parseAbi([
  'function castVote(address[] recipients, uint256[] allocations)',
  'function unstake()',
])
const REGISTRATION_DATA_TYPES = [
  { type: 'uint8' },
  { type: 'string' },
  { type: 'string' },
  { type: 'string' },
  { type: 'string' },
  { type: 'string' },
] as const

const MOCK_GOVERNANCE_RPC_PATH = '/mock-governance-rpc'
const MOCK_SUPERFLUID_URL_FRAGMENT = 'celo-mainnet/protocol-v1'
const MOCK_ACCOUNT: Address = '0x1234123412341234123412341234123412341234'
const MOCK_NOW_SECONDS = 1_784_419_200

type PendingTransactionEffect =
  | { kind: 'registration'; house: 0 | 1 }
  | { kind: 'vote' }
  | { kind: 'unstake' }

interface InteractiveGovernanceSession {
  memberStatus: 0 | 1 | 2 | 3 | 4
  memberHouse: 0 | 1
  hasVoted: boolean
}

function buildMockReceipt(status: 'success' | 'reverted', hash: Hex) {
  return {
    blockHash: `0x${'b'.repeat(64)}`,
    blockNumber: '0x10',
    contractAddress: null,
    cumulativeGasUsed: '0x5208',
    effectiveGasPrice: '0x1',
    from: MOCK_ACCOUNT,
    gasUsed: '0x5208',
    logs: [],
    logsBloom: `0x${'0'.repeat(512)}`,
    status: status === 'reverted' ? '0x0' : '0x1',
    to: MOCK_HOUSES,
    transactionHash: hash,
    transactionIndex: '0x0',
    type: '0x2',
  }
}

function buildMockBlock() {
  return {
    baseFeePerGas: '0x0',
    difficulty: '0x0',
    extraData: '0x',
    gasLimit: '0x1c9c380',
    gasUsed: '0x0',
    hash: `0x${'b'.repeat(64)}`,
    logsBloom: `0x${'0'.repeat(512)}`,
    miner: MOCK_HOUSES,
    mixHash: `0x${'c'.repeat(64)}`,
    nonce: '0x0000000000000000',
    number: '0x10',
    parentHash: `0x${'d'.repeat(64)}`,
    receiptsRoot: `0x${'e'.repeat(64)}`,
    sha3Uncles: `0x${'f'.repeat(64)}`,
    size: '0x0',
    stateRoot: `0x${'1'.repeat(64)}`,
    timestamp: `0x${MOCK_NOW_SECONDS.toString(16)}`,
    totalDifficulty: '0x0',
    transactions: [],
    transactionsRoot: `0x${'2'.repeat(64)}`,
    uncles: [],
  }
}

function buildMockFundingStreams() {
  return {
    data: {
      streams: [
        {
          sender: { id: MOCK_CITIZEN.toLowerCase() },
          currentFlowRate: '0',
          streamedUntilUpdatedAt: '300000000000000000000',
          updatedAtTimestamp: String(MOCK_NOW_SECONDS),
        },
        {
          sender: { id: MOCK_ALIGNMENT.toLowerCase() },
          currentFlowRate: '1',
          streamedUntilUpdatedAt: '150000000000000000000',
          updatedAtTimestamp: String(MOCK_NOW_SECONDS),
        },
      ],
    },
  }
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

export interface InteractiveGovernanceEnvironment {
  provider: EIP1193Provider
  celoRpcUrl: string
  addresses: { housesAddress: Address; goodIdAddress: Address; gTokenAddress: Address }
  teardown: () => void
}

/**
 * Wires a self-contained, browser-native mocked Celo RPC and Superfluid
 * subgraph behind a `window.fetch` override, paired with a matching mock
 * EIP-1193 wallet. This lets a human open the story directly in Storybook
 * and drive the real `useGovernanceAdapter` runtime end-to-end (onboarding ->
 * vote -> unstake) without a live contract or Playwright's `page.route`
 * network interception, which only runs under automation.
 */
export function createInteractiveGovernanceEnvironment(): InteractiveGovernanceEnvironment {
  const session: InteractiveGovernanceSession = { memberStatus: 0, memberHouse: 0, hasVoted: false }
  const pendingEffectsByHash = new Map<Hex, PendingTransactionEffect>()
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {}
  const originalFetch = window.fetch.bind(window)
  let transactionCounter = 0

  const nextTransactionHash = (): Hex => {
    transactionCounter += 1
    return `0x${transactionCounter.toString(16).padStart(64, '0')}` as Hex
  }

  const applyReceiptEffect = (effect: PendingTransactionEffect) => {
    if (effect.kind === 'registration') {
      session.memberStatus = 2
      session.memberHouse = effect.house
    } else if (effect.kind === 'vote') {
      session.hasVoted = true
    } else if (effect.kind === 'unstake') {
      session.memberStatus = 4
    }
  }

  const provider = {
    async request({ method, params }: { method: string; params?: unknown }) {
      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts':
          return [MOCK_ACCOUNT]
        case 'eth_chainId':
          return '0xa4ec'
        case 'wallet_switchEthereumChain':
          return null
        case 'eth_estimateGas':
          return '0x5208'
        case 'eth_sendTransaction': {
          const tx = (params as Array<Record<string, unknown>>)?.[0] ?? {}
          const to = String(tx.to ?? '').toLowerCase()
          const data = tx.data as Hex
          const hash = nextTransactionHash()

          if (to === MOCK_HOUSES.toLowerCase()) {
            const decoded = decodeFunctionData({ abi: HOUSES_WRITE_ABI, data })
            if (decoded.functionName === 'castVote') pendingEffectsByHash.set(hash, { kind: 'vote' })
            if (decoded.functionName === 'unstake') pendingEffectsByHash.set(hash, { kind: 'unstake' })
          } else if (to === MOCK_G_TOKEN.toLowerCase()) {
            const decoded = decodeFunctionData({ abi: G_TOKEN_WRITE_ABI, data })
            if (decoded.functionName === 'transferAndCall') {
              const registrationData = decoded.args[2]
              const [house] = decodeAbiParameters(REGISTRATION_DATA_TYPES, registrationData)
              pendingEffectsByHash.set(hash, { kind: 'registration', house: Number(house) === 1 ? 1 : 0 })
            }
          }
          return hash
        }
        default:
          throw new Error(`Interactive governance mock: unsupported wallet method "${method}"`)
      }
    },
    on(event: string, listener: (...args: unknown[]) => void) {
      listeners[event] = [...(listeners[event] ?? []), listener]
    },
    removeListener(event: string, listener: (...args: unknown[]) => void) {
      listeners[event] = (listeners[event] ?? []).filter((entry) => entry !== listener)
    },
  } as EIP1193Provider

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input)

    if (url.includes(MOCK_GOVERNANCE_RPC_PATH)) {
      const payload = JSON.parse(String(init?.body ?? '{}')) as {
        id: number
        method: string
        params?: unknown[]
      }
      const respond = (result: unknown) =>
        new Response(JSON.stringify({ jsonrpc: '2.0', id: payload.id, result }), {
          headers: { 'content-type': 'application/json' },
        })

      if (payload.method === 'eth_getTransactionReceipt') {
        const hash = payload.params?.[0] as Hex
        const effect = pendingEffectsByHash.get(hash)
        if (effect) applyReceiptEffect(effect)
        return respond(buildMockReceipt('success', hash))
      }
      if (payload.method === 'eth_getBlockByNumber') return respond(buildMockBlock())
      if (payload.method === 'eth_blockNumber') return respond('0x10')
      if (payload.method !== 'eth_call') return respond('0x')

      const call = (payload.params?.[0] as { to?: Address; data?: Hex } | undefined) ?? {}
      if (!call.to || !call.data) return respond('0x')
      const result = encodeMockGovernanceRead(call.to, call.data, {
        memberStatusByAccount: { [MOCK_ACCOUNT.toLowerCase()]: session.memberStatus },
        memberHouseByAccount: { [MOCK_ACCOUNT.toLowerCase()]: session.memberHouse },
        hasVotedByVoter: { [MOCK_ACCOUNT.toLowerCase()]: session.hasVoted },
      })
      return respond(result)
    }

    if (url.includes(MOCK_SUPERFLUID_URL_FRAGMENT)) {
      return new Response(JSON.stringify(buildMockFundingStreams()), {
        headers: { 'content-type': 'application/json' },
      })
    }

    return originalFetch(input, init)
  }) as typeof window.fetch

  return {
    provider,
    celoRpcUrl: MOCK_GOVERNANCE_RPC_PATH,
    addresses: { housesAddress: MOCK_HOUSES, goodIdAddress: MOCK_GOOD_ID, gTokenAddress: MOCK_G_TOKEN },
    teardown: () => {
      window.fetch = originalFetch
    },
  }
}
