import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { EIP1193Provider } from '@goodwidget/core'
import { getAddress, isAddress, type Address, type PublicClient } from 'viem'
import type { RankedVotingOption } from '../types'
import type { GovernanceTransactionState, GovernanceVotingState } from '../widgetRuntimeContract'
import {
  ZERO_ADDRESS,
  createGovernanceWalletClient,
  safeMillisecondsFromSeconds,
  type GovernanceContractAddresses,
  type GovernanceMemberRecord,
} from '../sdks/contracts'
import {
  readGovernanceVote,
  type GovernanceSchedule,
} from '../sdks/contractReads'
import { castGovernanceVote } from '../sdks/transactions'
import { friendlyGovernanceError, transactionStatusFromError } from './useGovernanceMembership'

const IDLE_VOTE_TRANSACTION: GovernanceTransactionState = {
  kind: null,
  status: 'idle',
  hash: null,
  error: null,
}

function shortAddress(address: Address): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function nextVotingWindowLabel(schedule: GovernanceSchedule, nowMs = Date.now()): string {
  if (!schedule.cycleStartTime || schedule.termDurationSeconds === 0n) {
    return 'Contract schedule unavailable'
  }
  const termMs = safeMillisecondsFromSeconds(schedule.termDurationSeconds)
  if (termMs === null) return 'Contract schedule unavailable'
  const nextStart = nowMs < schedule.cycleStartTime
    ? schedule.cycleStartTime
    : schedule.cycleStartTime + (Math.floor((nowMs - schedule.cycleStartTime) / termMs) + 1) * termMs
  if (!Number.isSafeInteger(nextStart)) return 'Contract schedule unavailable'
  return `Next window starts ${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(nextStart))}`
}

export function resolveGovernanceVoterKey(
  member: GovernanceMemberRecord | null,
  identityRoot: Address | null,
  account: Address,
): Address {
  return member?.house === 'citizenship' && identityRoot && identityRoot.toLowerCase() !== ZERO_ADDRESS
    ? identityRoot
    : account
}

export function createVotingState(params: {
  member: GovernanceMemberRecord | null
  identityRoot: Address | null
  voteId: bigint
  isVotingOpen: boolean
  voteStartTime: number | null
  voteConfig: { startTime: number | null; endTime: number | null; executedAt: number | null; executed: boolean }
  recipients: Address[]
  hasVoted: boolean
  finalizedUnits: Record<string, bigint>
  schedule: GovernanceSchedule
}): GovernanceVotingState {
  const recipients = params.recipients.map((recipient) => getAddress(recipient))
  const totalUnits = Object.values(params.finalizedUnits).reduce((total, amount) => total + amount, 0n)
  const options: RankedVotingOption[] = recipients.map((recipient) => {
    const units = params.finalizedUnits[recipient.toLowerCase()] ?? params.finalizedUnits[recipient] ?? 0n
    return {
      id: recipient,
      label: shortAddress(recipient),
      percentage: totalUnits > 0n ? Number((units * 100n) / totalUnits) : 0,
    }
  })
  const allocationsBps = Object.fromEntries(options.map((option) => [option.id, 0]))
  const isActiveMember = params.member?.status === 'active'
  const hasCitizenIdentity = params.member?.house !== 'citizenship' || Boolean(
    params.identityRoot && params.identityRoot.toLowerCase() !== ZERO_ADDRESS,
  )
  const joinedBeforeVote = Boolean(
    params.member?.joinedAt &&
    params.voteStartTime &&
    params.member.joinedAt <= params.voteStartTime,
  )
  const canVote = Boolean(
    isActiveMember &&
    hasCitizenIdentity &&
    joinedBeforeVote &&
    params.isVotingOpen &&
    !params.hasVoted &&
    recipients.length > 0,
  )

  let title = 'Alignment vote'
  let summaryLabel = 'Allocate 10,000 bps to eligible House of Alignment recipients'
  let disabledReason: string | undefined

  if (!params.isVotingOpen) {
    title = 'Upcoming Alignment vote'
    summaryLabel = nextVotingWindowLabel(params.schedule)
    disabledReason = 'Voting is currently closed.'
  } else if (recipients.length === 0) {
    disabledReason = 'No House of Alignment members were eligible when this vote opened.'
  } else if (params.hasVoted) {
    disabledReason = 'You already voted in this allocation cycle.'
  } else if (!isActiveMember) {
    disabledReason = 'Only active members can vote.'
  } else if (!joinedBeforeVote) {
    disabledReason = 'Members who joined after this vote opened cannot participate in this cycle.'
  } else if (!hasCitizenIdentity) {
    disabledReason = 'Verify your GoodID before voting as a Citizen.'
  }

  if (params.voteConfig.executed) {
    title = 'Executed Alignment vote'
    summaryLabel = 'Final units executed'
    disabledReason = 'This vote has already been executed.'
  }

  return {
    voteId: params.voteId.toString(),
    title,
    summaryLabel,
    options,
    recipients,
    allocationsBps,
    allocationTotalBps: 0,
    canVote,
    hasVoted: params.hasVoted,
    isVotingOpen: params.isVotingOpen,
    executed: params.voteConfig.executed,
    finalizedUnits: Object.fromEntries(
      Object.entries(params.finalizedUnits).map(([recipient, units]) => [recipient, units.toString()]),
    ),
    disabledReason,
  }
}

export function validateGovernanceBallot(
  recipients: string[],
  allocationsBps: Record<string, number>,
): { recipients: Address[]; allocations: bigint[] } {
  if (recipients.length === 0) throw new Error('No recipients')
  if (!recipients.every((recipient) => isAddress(recipient))) throw new Error('Invalid recipient')

  const normalized = recipients.map((recipient) => getAddress(recipient))
  if (new Set(normalized.map((recipient) => recipient.toLowerCase())).size !== normalized.length) {
    throw new Error('Duplicate recipient')
  }
  const allocations = normalized.map((recipient, index) => {
    const originalRecipient = recipients[index]
    const amount = allocationsBps[recipient]
      ?? allocationsBps[originalRecipient]
      ?? allocationsBps[recipient.toLowerCase()]
      ?? 0
    if (!Number.isSafeInteger(amount)) throw new Error('Invalid allocation')
    return BigInt(amount)
  })
  const total = allocations.reduce((sum, allocation) => sum + allocation, 0n)
  if (allocations.some((allocation) => allocation < 0n || allocation > 10_000n)) {
    throw new Error('Invalid allocation')
  }
  if (total !== 10_000n) throw new Error('Alloc != 10000')
  return { recipients: normalized, allocations }
}

export function createEmptyVotingState(): GovernanceVotingState {
  return {
    voteId: '0',
    title: 'Upcoming Alignment vote',
    summaryLabel: 'Contract schedule unavailable',
    options: [],
    recipients: [],
    allocationsBps: {},
    allocationTotalBps: 0,
    canVote: false,
    hasVoted: false,
    isVotingOpen: false,
    executed: false,
    finalizedUnits: {},
    disabledReason: 'Connect a wallet to load governance voting state.',
  }
}

export function useGovernanceVoting(params: {
  enabled: boolean
  account: Address | null
  provider: EIP1193Provider | null
  publicClient: PublicClient
  addresses: GovernanceContractAddresses
  member: GovernanceMemberRecord | null
  identityRoot: Address | null
  activeAlignment: Address[]
  schedule: GovernanceSchedule | null
}) {
  const {
    enabled,
    account,
    provider,
    publicClient,
    addresses,
    member,
    identityRoot,
    activeAlignment,
    schedule,
  } = params
  const [voting, setVoting] = useState<GovernanceVotingState>(() => createEmptyVotingState())
  const [transaction, setTransaction] = useState<GovernanceTransactionState>(IDLE_VOTE_TRANSACTION)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refreshRequestId = useRef(0)

  const refresh = useCallback(async () => {
    if (!enabled || !account || !addresses.houses || !schedule) return
    const requestId = ++refreshRequestId.current
    try {
      const voterKey = resolveGovernanceVoterKey(member, identityRoot, account)
      const vote = await readGovernanceVote({
        publicClient,
        housesAddress: addresses.houses,
        voterKey,
        activeAlignment,
        schedule,
      })
      if (requestId === refreshRequestId.current) {
        setVoting(createVotingState({
          member,
          identityRoot,
          voteId: vote.voteId,
          isVotingOpen: vote.isVotingPeriod,
          voteStartTime: vote.voteStartTime,
          voteConfig: vote.voteConfig,
          recipients: vote.recipients,
          hasVoted: vote.hasVoted,
          finalizedUnits: vote.finalizedUnits,
          schedule,
        }))
        setError(null)
      }
    } catch (err: unknown) {
      if (requestId === refreshRequestId.current) setError(friendlyGovernanceError(err))
    }
  }, [account, activeAlignment, addresses.houses, enabled, identityRoot, member, publicClient, schedule])

  useEffect(() => {
    refreshRequestId.current += 1
    setVoting(createEmptyVotingState())
    setTransaction(IDLE_VOTE_TRANSACTION)
    setIsDetailOpen(false)
    setError(null)
  }, [account, addresses.houses, enabled])

  useEffect(() => {
    if (enabled) void refresh()
  }, [enabled, refresh])

  const setVoteAllocation = useCallback((recipientId: string, basisPoints: number) => {
    setVoting((previous) => {
      if (!(recipientId in previous.allocationsBps)) return previous
      const normalizedBasisPoints = Number.isFinite(basisPoints)
        ? Math.trunc(basisPoints)
        : 0
      const allocationsBps = {
        ...previous.allocationsBps,
        [recipientId]: Math.max(0, Math.min(10_000, normalizedBasisPoints)),
      }
      const allocationTotalBps = Object.values(allocationsBps).reduce((total, amount) => total + amount, 0)
      return {
        ...previous,
        allocationsBps,
        allocationTotalBps,
        disabledReason: allocationTotalBps === 10_000 && previous.canVote
          ? undefined
          : allocationTotalBps === 10_000
            ? previous.disabledReason
            : 'Allocation totals must equal exactly 10,000 basis points.',
      }
    })
  }, [])

  const submitVote = useCallback(async () => {
    if (!account || !addresses.houses) return
    if (!voting.canVote) {
      const unavailableError = voting.disabledReason ?? 'Voting is currently unavailable.'
      setError(unavailableError)
      return
    }
    const walletClient = createGovernanceWalletClient({ provider, account })
    if (!walletClient) {
      const providerError = 'The connected wallet provider is unavailable.'
      setTransaction({ kind: 'vote', status: 'failed', hash: null, error: providerError })
      setError(providerError)
      return
    }

    try {
      const ballot = validateGovernanceBallot(voting.recipients, voting.allocationsBps)
      setTransaction({ kind: 'vote', status: 'wallet_confirmation', hash: null, error: null })
      const hash = await castGovernanceVote({
        publicClient,
        walletClient,
        account,
        housesAddress: addresses.houses,
        recipients: ballot.recipients,
        allocationsBps: ballot.allocations,
        onStage: (stage, stageHash) => setTransaction({
          kind: 'vote',
          status: stage,
          hash: stageHash ?? null,
          error: null,
        }),
      })
      setTransaction({ kind: 'vote', status: 'confirmed', hash, error: null })
      await refresh()
    } catch (err: unknown) {
      const status = transactionStatusFromError(err)
      const friendlyError = friendlyGovernanceError(err)
      setTransaction((previous) => ({ ...previous, kind: 'vote', status, error: friendlyError }))
      setError(friendlyError)
    }
  }, [account, addresses.houses, provider, publicClient, refresh, voting])

  return useMemo(() => ({
    voting,
    transaction,
    isDetailOpen,
    error,
    refresh,
    openVote: () => setIsDetailOpen(true),
    closeVote: () => setIsDetailOpen(false),
    setVoteAllocation,
    submitVote,
  }), [error, isDetailOpen, refresh, setVoteAllocation, submitVote, transaction, voting])
}
