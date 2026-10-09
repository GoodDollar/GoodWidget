import { getAddress, type Address } from 'viem'

export const SUPERFLUID_CELO_SUBGRAPH_URL = 'https://subgraph-endpoints.superfluid.dev/celo-mainnet/protocol-v1'
export const FUNDING_STREAMS_QUERY = `query FundingStreams($receiver: String!, $token: String!, $first: Int!, $skip: Int!) {
  streams(
    first: $first
    skip: $skip
    where: { receiver: $receiver, token: $token }
  ) {
    sender { id }
    currentFlowRate
    streamedUntilUpdatedAt
    updatedAtTimestamp
  }
}`

export interface FundingStreamRecord {
  sender: { id: string }
  currentFlowRate: string
  streamedUntilUpdatedAt: string
  updatedAtTimestamp: string
}

export interface FundingTotalResult {
  amountWei: bigint
  formattedAmount: string
  streamCount: number
  activeStreamCount: number
}

interface FundingStreamsResponse {
  data?: { streams?: FundingStreamRecord[] }
  errors?: Array<{ message?: string }>
}

export function formatFundingAmountWei(amountWei: bigint, maximumFractionDigits = 3): string {
  const decimals = 18
  const requestedPrecision = Number.isFinite(maximumFractionDigits)
    ? Math.trunc(maximumFractionDigits)
    : 3
  const precision = Math.max(0, Math.min(decimals, requestedPrecision))
  const fractionalScale = 10n ** BigInt(precision)
  const roundingDivisor = 10n ** BigInt(decimals - precision)
  const rounded = (amountWei + roundingDivisor / 2n) / roundingDivisor
  const whole = rounded / fractionalScale
  const fraction = (rounded % fractionalScale)
    .toString()
    .padStart(precision, '0')
    .replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

export function calculateStreamAmountWei(stream: FundingStreamRecord, nowSeconds: bigint): bigint {
  const streamedUntilUpdatedAt = BigInt(stream.streamedUntilUpdatedAt)
  const currentFlowRate = BigInt(stream.currentFlowRate)
  const updatedAtTimestamp = BigInt(stream.updatedAtTimestamp)
  const elapsedSeconds = nowSeconds > updatedAtTimestamp ? nowSeconds - updatedAtTimestamp : 0n
  return streamedUntilUpdatedAt + currentFlowRate * elapsedSeconds
}

export async function fetchFundingReceivedSoFar(params: {
  receiver: Address
  token: Address
  nowSeconds?: bigint
  endpoint?: string
  fetcher?: typeof fetch
}): Promise<FundingTotalResult> {
  const endpoint = params.endpoint ?? SUPERFLUID_CELO_SUBGRAPH_URL
  const fetcher = params.fetcher ?? fetch
  const receiver = getAddress(params.receiver).toLowerCase()
  const token = getAddress(params.token).toLowerCase()
  const nowSeconds = params.nowSeconds ?? BigInt(Math.floor(Date.now() / 1000))
  const first = 1000
  let skip = 0
  let total = 0n
  let activeStreamCount = 0
  for (;;) {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: FUNDING_STREAMS_QUERY,
        variables: { receiver, token, first, skip },
      }),
    })

    if (!response.ok) {
      throw new Error(`Funding subgraph returned HTTP ${response.status}`)
    }

    const json = (await response.json()) as FundingStreamsResponse
    if (json.errors?.length) {
      throw new Error(json.errors.map((error) => error.message).filter(Boolean).join('; ') || 'Funding subgraph error')
    }

    const streams = json.data?.streams ?? []
    for (const stream of streams) {
      total += calculateStreamAmountWei(stream, nowSeconds)
      if (BigInt(stream.currentFlowRate) !== 0n) {
        activeStreamCount += 1
      }
    }

    if (streams.length < first) {
      return {
        amountWei: total,
        formattedAmount: formatFundingAmountWei(total),
        streamCount: skip + streams.length,
        activeStreamCount,
      }
    }

    skip += first
  }
}
