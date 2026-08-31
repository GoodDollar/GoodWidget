import { SUBGRAPH_URLS } from '@goodsdks/streaming-sdk'
import type { StreamQueryResult } from '@goodsdks/streaming-sdk'
import type { Address } from 'viem'

/**
 * The SDK's `SubgraphClient.queryStreams` hardcodes `currentFlowRate_gt: "0"` into
 * its GraphQL documents, so it can only ever return streams that are still running.
 * The History tab needs ended streams too, which the Superfluid `streams` entity
 * does retain (with `currentFlowRate: "0"`), so the query is issued here without
 * that filter.
 *
 * Drop this module once `GetStreamsOptions` upstream grows a way to include ended
 * streams, and go back to `SubgraphClient`.
 */

const BATCH_SIZE = 100
const MAX_RESULTS = 1_000

const STREAM_FIELDS = `
  id
  sender { id }
  receiver { id }
  token { id symbol }
  currentFlowRate
  streamedUntilUpdatedAt
  updatedAtTimestamp
  createdAtTimestamp
`

const OUTGOING_STREAMS = `
  query WidgetOutgoingStreams($account: String!, $first: Int!, $skip: Int!) {
    streams(
      where: { sender: $account }
      first: $first
      skip: $skip
      orderBy: updatedAtTimestamp
      orderDirection: desc
    ) { ${STREAM_FIELDS} }
  }
`

const INCOMING_STREAMS = `
  query WidgetIncomingStreams($account: String!, $first: Int!, $skip: Int!) {
    streams(
      where: { receiver: $account }
      first: $first
      skip: $skip
      orderBy: updatedAtTimestamp
      orderDirection: desc
    ) { ${STREAM_FIELDS} }
  }
`

interface RawStream {
  id: string
  sender: { id: string }
  receiver: { id: string }
  token: { id: string; symbol: string }
  currentFlowRate: string
  streamedUntilUpdatedAt: string
  updatedAtTimestamp: string
  createdAtTimestamp: string
}

/** `StreamQueryResult` has no token symbol, so it is carried alongside. */
export type StreamQueryRow = StreamQueryResult & { tokenSymbol: string }

interface GraphQLResponse {
  data?: { streams?: RawStream[] }
  errors?: Array<{ message: string }>
}

/** Public Superfluid endpoint for a supported chain, or null when unsupported. */
export function streamsSubgraphUrl(chainId: number | null): string | null {
  if (!chainId) return null
  return SUBGRAPH_URLS[chainId] ?? null
}

function toStreamQueryResult(stream: RawStream): StreamQueryRow {
  return {
    id: stream.id,
    sender: stream.sender.id as Address,
    receiver: stream.receiver.id as Address,
    token: stream.token.id as Address,
    currentFlowRate: BigInt(stream.currentFlowRate),
    streamedUntilUpdatedAt: BigInt(stream.streamedUntilUpdatedAt),
    updatedAtTimestamp: Number(stream.updatedAtTimestamp),
    createdAtTimestamp: Number(stream.createdAtTimestamp),
    tokenSymbol: stream.token.symbol,
  }
}

async function fetchPage(
  endpoint: string,
  query: string,
  account: string,
  skip: number,
): Promise<RawStream[]> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { account, first: BATCH_SIZE, skip },
    }),
  })

  if (!response.ok) {
    throw new Error(`Subgraph request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as GraphQLResponse

  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message)
  }

  return payload.data?.streams ?? []
}

async function fetchDirection(
  endpoint: string,
  query: string,
  account: string,
): Promise<RawStream[]> {
  const collected: RawStream[] = []

  for (let skip = 0; skip < MAX_RESULTS; skip += BATCH_SIZE) {
    const page = await fetchPage(endpoint, query, account, skip)
    collected.push(...page)

    if (page.length < BATCH_SIZE) break
  }

  return collected
}

/**
 * Every stream the account has ever opened or received on this chain, running and
 * ended alike. Callers tell the two apart via `currentFlowRate`.
 */
export async function queryAllStreams(
  endpoint: string,
  account: Address,
): Promise<StreamQueryRow[]> {
  // Subgraph entity ids are lowercased addresses.
  const normalizedAccount = account.toLowerCase()

  const [outgoing, incoming] = await Promise.all([
    fetchDirection(endpoint, OUTGOING_STREAMS, normalizedAccount),
    fetchDirection(endpoint, INCOMING_STREAMS, normalizedAccount),
  ])

  // A self-stream shows up in both directions.
  const byId = new Map<string, RawStream>()
  for (const stream of [...outgoing, ...incoming]) {
    byId.set(stream.id, stream)
  }

  return Array.from(byId.values()).map(toStreamQueryResult)
}
