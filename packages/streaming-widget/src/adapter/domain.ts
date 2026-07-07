import { calculateFlowRate } from '@goodsdks/streaming-sdk'
import type { GDAPool, StreamInfo } from '@goodsdks/streaming-sdk'
import type { Address } from 'viem'
import { parseUnits } from 'viem'
import type {
  PoolMembershipItem,
  SetStreamFormState,
  StreamListItem,
} from '../widgetRuntimeContract'

export const GDA_POOL_CLAIM_ABI = [
  {
    type: 'function',
    name: 'getClaimableNow',
    inputs: [{ name: 'memberAddr', type: 'address' }],
    outputs: [
      { name: 'claimableBalance', type: 'int256' },
      { name: 'timestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'claimAll',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const

export const DEFAULT_FORM_STATE: SetStreamFormState = {
  receiver: '',
  amount: '',
  timeUnit: 'month',
  flowRate: null,
  validationError: null,
}

export function humanReadableError(err: unknown): string {
  console.error('[StreamingWidget]', err)

  if (!(err instanceof Error)) return 'Something went wrong. Please try again.'

  const msg = err.message

  if (
    msg.includes('Failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('NetworkError') ||
    msg.includes('net::ERR_')
  ) {
    return 'Unable to reach the network. Check your connection and try again.'
  }

  if (msg.includes('timeout') || msg.includes('Timeout') || msg.includes('timed out')) {
    return 'The request timed out. Please try again.'
  }

  if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('4001')) {
    return 'Transaction cancelled by wallet.'
  }

  if (msg.includes('Token address not available')) {
    return 'This token is not available on the current chain.'
  }

  return 'Something went wrong. Please try again.'
}

export function toStreamListItem(stream: StreamInfo, address: Address): StreamListItem {
  const direction =
    stream.sender.toLowerCase() === address.toLowerCase() ? 'outgoing' : 'incoming'
  return {
    id: `${stream.sender}-${stream.receiver}-${stream.token}`,
    sender: stream.sender,
    receiver: stream.receiver,
    token: stream.token,
    flowRate: stream.flowRate,
    streamedSoFar: stream.streamedSoFar ?? 0n,
    createdAtTimestamp: stream.timestamp ? Number(stream.timestamp) : 0,
    updatedAtTimestamp: stream.timestamp ? Number(stream.timestamp) : 0,
    direction,
  }
}

export function toPoolMembershipItem(pool: GDAPool): PoolMembershipItem {
  const poolWithClaimable = pool as GDAPool & { claimableAmount?: bigint }
  return {
    poolId: pool.id,
    poolToken: pool.token,
    totalUnits: pool.totalUnits,
    claimableAmount: poolWithClaimable.claimableAmount ?? 0n,
    claimableAmountError: false,
    totalAmountClaimed: pool.totalAmountClaimed,
    isConnected: pool.isConnected ?? false,
  }
}

export function validateSetStreamForm(form: SetStreamFormState): SetStreamFormState {
  const trimmedReceiver = form.receiver.trim()
  const trimmedAmount = form.amount.trim()

  if (!trimmedReceiver) {
    return { ...form, flowRate: null, validationError: 'Recipient address is required.' }
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(trimmedReceiver)) {
    return {
      ...form,
      flowRate: null,
      validationError: 'Recipient must be a valid Ethereum address (0x...).',
    }
  }

  if (!trimmedAmount || Number.isNaN(Number(trimmedAmount)) || Number(trimmedAmount) <= 0) {
    return { ...form, flowRate: null, validationError: 'Enter a positive flow amount.' }
  }

  try {
    const amountWei = parseUnits(trimmedAmount, 18)
    const flowRate = calculateFlowRate(amountWei, form.timeUnit)
    return { ...form, flowRate, validationError: null }
  } catch {
    return { ...form, flowRate: null, validationError: 'Invalid amount.' }
  }
}
