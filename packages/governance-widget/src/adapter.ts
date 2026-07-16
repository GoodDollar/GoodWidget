import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet } from '@goodwidget/core'
import { getAddress, isAddress, type Address, type Hex } from 'viem'
import type { StepperStepItem } from '@goodwidget/ui'
import type { GovernanceHouse, GovernanceProfileDraft, RankedVotingOption } from './types'
import type {
  GovernanceDashboardState,
  GovernanceWidgetAdapterActions,
  GovernanceWidgetAdapterFactoryInput,
  GovernanceWidgetAdapterResult,
  GovernanceWidgetAdapterState,
  GovernanceWidgetStatus,
  GovernanceVotingState,
} from './widgetRuntimeContract'
import {
  CELO_CHAIN_ID,
  ZERO_ADDRESS,
  createGovernancePublicClient,
  createGovernanceWalletClient,
  formatStakeAmount,
  requestCeloMainnetSwitch,
  resolveGovernanceAddresses,
  type GovernanceMemberRecord,
} from './sdks/contracts'
import {
  readFlowSplitterConfig,
  readGovernanceMembership,
  readGovernanceSchedule,
  readGovernanceVote,
  stakeRequirementLabel,
  type GovernanceSchedule,
  type GovernanceStakeRequirements,
} from './sdks/contractReads'
import { castGovernanceVote, registerWithTransferAndCall, restakeWithTransferAndCall, type GovernanceTransactionStage } from './sdks/transactions'
import { fetchFundingReceivedSoFar } from './sdks/funding'
import { createGovernanceIdentitySdk, createGovernanceIdentityVerificationLink } from './sdks/identity'

const IMPACT_METRICS: GovernanceDashboardState['impact'] = {
  title: 'Distributed',
  metrics: [
    { label: 'UBI Pool', amount: { value: 'Unavailable', token: '' } },
    {
      label: 'Impact Pool',
      amount: { value: 'Live total below', token: '' },
    },
  ],
  description:
    'Empowering people worldwide through transparent, decentralized funding for public goods.',
}

const EMPTY_STAKES: GovernanceStakeRequirements = {
  citizenship: 0n,
  alignment: 0n,
}

function shortAddress(address: Address): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function createTransactionSteps(stage: GovernanceTransactionStage | 'idle' | 'failed', failedMessage?: string): StepperStepItem[] {
  const statuses: Record<string, StepperStepItem['status']> = {
    prepare: stage === 'idle' ? 'active' : 'completed',
    approve: stage === 'wallet_confirmation' ? 'active' : stage === 'idle' ? 'pending' : 'completed',
    stake: stage === 'submitted' ? 'active' : stage === 'confirmed' ? 'completed' : stage === 'failed' ? 'failed' : 'pending',
    finalize: stage === 'confirmed' ? 'completed' : 'pending',
  }

  return [
    {
      id: 'prepare',
      title: 'Prepare wallet balance',
      description: 'Keep the required G$ amount available before the staking transaction starts.',
      status: statuses.prepare,
    },
    {
      id: 'approve',
      title: 'Confirm in wallet',
      description: 'Approve the G$ transferAndCall transaction from your wallet.',
      status: statuses.approve,
    },
    {
      id: 'stake',
      title: 'Transaction submitted',
      description: failedMessage ?? 'Wait for the Celo transaction receipt before continuing.',
      status: statuses.stake,
    },
    {
      id: 'finalize',
      title: 'Confirmed on-chain',
      status: statuses.finalize,
    },
  ]
}

function nextVotingWindowLabel(schedule: GovernanceSchedule, nowMs = Date.now()): string {
  if (!schedule.cycleStartTime || schedule.termDurationSeconds === 0n) {
    return 'Contract schedule unavailable'
  }
  const termMs = Number(schedule.termDurationSeconds) * 1000
  const cycleStart = schedule.cycleStartTime
  const nextStart = nowMs < cycleStart ? cycleStart : cycleStart + (Math.floor((nowMs - cycleStart) / termMs) + 1) * termMs
  return `Next window starts ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(nextStart))}`
}

function createVotingState(params: {
  status: GovernanceWidgetStatus
  member: GovernanceMemberRecord | null
  identityRoot: Address
  activeAlignment: Address[]
  voteId: bigint
  isVotingOpen: boolean
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
  const hasCitizenIdentity = params.member?.house !== 'citizenship' || params.identityRoot.toLowerCase() !== ZERO_ADDRESS
  const canVote = Boolean(isActiveMember && hasCitizenIdentity && params.isVotingOpen && !params.hasVoted && recipients.length > 0)

  let title = 'Alignment vote'
  let summaryLabel = 'Allocate 10,000 bps to active House of Alignment recipients'
  let disabledReason: string | undefined

  if (!params.isVotingOpen) {
    title = 'Upcoming Alignment vote'
    summaryLabel = nextVotingWindowLabel(params.schedule)
    disabledReason = 'Voting is currently closed.'
  } else if (params.activeAlignment.length === 0) {
    disabledReason = 'No House of Alignment members have been assigned yet. Voting will open shortly.'
  } else if (params.hasVoted) {
    disabledReason = 'You already voted in this allocation cycle.'
  } else if (!isActiveMember) {
    disabledReason = 'Only active members can vote.'
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
    finalizedUnits: Object.fromEntries(Object.entries(params.finalizedUnits).map(([recipient, units]) => [recipient, units.toString()])),
    disabledReason,
  }
}

function createDashboardState(params: {
  activeMemberCount?: number
  voting?: GovernanceVotingState
  funding?: GovernanceDashboardState['fundingDistribution']
} = {}): GovernanceDashboardState {
  return {
    impact: IMPACT_METRICS,
    activeMembers: {
      icon: 'check',
      title: 'Active Members',
      amount: params.activeMemberCount ?? 0,
      amountType: 'raw',
      metadataType: 'time-window',
      metadata: { label: 'Active members only', tone: 'muted', icon: 'info' },
    },
    alignmentVoting:
      params.voting ??
      {
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
      },
    fundingDistribution:
      params.funding ??
      {
        title: 'Funding received so far',
        centerLabel: 'Loading live funding',
        totalAmount: { value: '0', token: 'G$', isStreaming: true, streamLabel: 'Loading Superfluid streams' },
        projects: [],
        isStreaming: true,
        emptyStateLabel: 'Loading funding streams…',
      },
  }
}

function createInitialState(status: GovernanceWidgetStatus = 'disconnected'): GovernanceWidgetAdapterState {
  return {
    status,
    address: null,
    chainId: null,
    identityStatus: 'unverified',
    identityVerificationUrl: null,
    member: null,
    dashboard: createDashboardState(),
    selectedHouse: 'citizenship',
    disabledHouseOptions: ['alignment'],
    onboardingStepId: undefined,
    profileDraft: {},
    stakeAmountLabel: '0 G$',
    minimumStakeAmounts: EMPTY_STAKES,
    transactionSteps: createTransactionSteps('idle'),
    registrationHash: null,
    error: null,
  }
}

function friendlyGovernanceError(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Something went wrong. Please try again.'
  }

  const message = err.message
  if (message.includes('User rejected') || message.includes('4001')) {
    return 'Transaction rejected in the wallet.'
  }
  if (message.includes('Already voted')) {
    return 'You already voted in this allocation cycle.'
  }
  if (message.includes('Alloc != 10000')) {
    return 'Allocation totals must equal exactly 10,000 basis points.'
  }
  if (message.includes('insufficient funds')) {
    return 'Your wallet does not have enough funds for this governance action.'
  }
  if (message.includes('Not HoA eligible')) {
    return 'This wallet is not currently eligible for House of Alignment registration.'
  }
  if (message.includes('revert') || message.includes('reverted')) {
    return 'The governance contract rejected this action. Review your details and try again.'
  }
  if (message.includes('fetch') || message.includes('network') || message.includes('HTTP')) {
    return 'Unable to reach Celo Mainnet. Check your connection and try again.'
  }

  return 'Unable to complete the governance action. Please try again.'
}

function statusFromMember(member: GovernanceMemberRecord | null): GovernanceWidgetStatus {
  if (!member || member.status === 'none') return 'onboarding_required'
  if (member.status === 'pending' && member.house === 'alignment') return 'pending_alignment'
  if (member.status === 'active' && member.house === 'alignment') return 'active_alignment'
  if (member.status === 'active') return 'active_citizenship'
  if (member.status === 'revoked' || member.status === 'unstaked') return 'restake_required'
  return 'onboarding_required'
}

function isActiveStatus(status: GovernanceWidgetStatus): boolean {
  return status === 'active_alignment' || status === 'active_citizenship'
}

function transactionStageToStep(stage: GovernanceTransactionStage, hash?: Hex): Partial<GovernanceWidgetAdapterState> {
  return {
    registrationHash: hash ?? null,
    transactionSteps: createTransactionSteps(stage),
  }
}

export function useGovernanceAdapter({
  environment = 'production',
  celoRpcUrl,
  addresses: addressOverrides,
}: GovernanceWidgetAdapterFactoryInput = {}): GovernanceWidgetAdapterResult {
  const { address, chainId, provider, connect } = useWallet()
  const [state, setState] = useState<GovernanceWidgetAdapterState>(() => createInitialState())
  const publicClient = useMemo(() => createGovernancePublicClient(celoRpcUrl), [celoRpcUrl])
  const addresses = useMemo(() => resolveGovernanceAddresses(addressOverrides), [addressOverrides])
  const account = address as Address | null

  const loadRuntimeState = useCallback(async () => {
    if (!account) {
      setState((previous) => ({ ...previous, ...createInitialState('disconnected'), chainId: chainId ?? null }))
      return
    }

    if (chainId !== CELO_CHAIN_ID) {
      setState((previous) => ({
        ...previous,
        status: 'unsupported_chain',
        address: account,
        chainId: chainId ?? null,
        error: null,
      }))
      return
    }

    if (!addresses.houses) {
      setState((previous) => ({
        ...previous,
        status: 'friendly_error',
        address: account,
        chainId,
        error: 'Governance contract address is not configured yet.',
      }))
      return
    }

    setState((previous) => ({ ...previous, status: 'loading', address: account, chainId, error: null }))

    try {
      const membership = await readGovernanceMembership({
        publicClient,
        housesAddress: addresses.houses,
        goodIdAddress: addresses.goodId,
        account,
      })
      const status = statusFromMember(membership.member)
      const schedule = await readGovernanceSchedule({ publicClient, housesAddress: addresses.houses })
      const voterKey = membership.member.house === 'citizenship' && membership.identityRoot.toLowerCase() !== ZERO_ADDRESS
        ? membership.identityRoot
        : account
      const vote = await readGovernanceVote({
        publicClient,
        housesAddress: addresses.houses,
        voterKey,
        activeAlignment: membership.activeAlignment,
      })
      const votingState = createVotingState({
        status,
        member: membership.member,
        identityRoot: membership.identityRoot,
        activeAlignment: membership.activeAlignment,
        voteId: vote.voteId,
        isVotingOpen: vote.isVotingPeriod,
        voteConfig: vote.voteConfig,
        recipients: vote.recipients,
        hasVoted: vote.hasVoted,
        finalizedUnits: vote.finalizedUnits,
        schedule,
      })
      let funding: GovernanceDashboardState['fundingDistribution'] = {
        title: 'Funding received so far',
        centerLabel: 'Funding unavailable',
        totalAmount: { value: '0', token: 'G$', isStreaming: false, streamLabel: 'Superfluid stream data unavailable' },
        projects: [],
        emptyStateLabel: 'Funding data is unavailable right now.',
      }

      try {
        const flowConfig = await readFlowSplitterConfig({ publicClient, housesAddress: addresses.houses })
        if (flowConfig.poolAddress.toLowerCase() === ZERO_ADDRESS) {
          funding = {
            title: 'Funding received so far',
            centerLabel: 'No receiver configured',
            totalAmount: { value: '0', token: 'G$', isStreaming: false, streamLabel: 'No FlowSplitter pool receiver yet' },
            projects: [],
            emptyStateLabel: 'No funding receiver has been configured yet.',
          }
        } else {
          const fundingTotal = await fetchFundingReceivedSoFar({ receiver: flowConfig.poolAddress, token: addresses.gToken })
          funding = {
            title: 'Funding received so far',
            centerLabel: fundingTotal.streamCount > 0 ? 'Live Superfluid total' : 'No streams yet',
            totalAmount: {
              value: fundingTotal.formattedAmount,
              token: 'G$',
              isStreaming: fundingTotal.streamCount > 0,
              streamLabel: fundingTotal.streamCount > 0 ? `${fundingTotal.streamCount} inbound stream${fundingTotal.streamCount === 1 ? '' : 's'}` : 'No inbound streams found',
            },
            projects: [],
            isStreaming: fundingTotal.streamCount > 0,
            emptyStateLabel: fundingTotal.streamCount > 0 ? 'Distribution breakdown unavailable until outgoing stream data exists.' : 'No funding streams have been received yet.',
          }
        }
      } catch {
        // Keep membership and voting usable if the subgraph is unavailable.
      }

      const selectedHouse = membership.member.status === 'none' ? state.selectedHouse : membership.member.house
      setState((previous) => ({
        ...previous,
        status,
        address: account,
        chainId,
        identityStatus: membership.identityRoot.toLowerCase() !== ZERO_ADDRESS ? 'verified' : 'unverified',
        member: membership.member,
        dashboard: createDashboardState({
          activeMemberCount: membership.activeCitizens.length + membership.activeAlignment.length,
          voting: votingState,
          funding,
        }),
        selectedHouse,
        disabledHouseOptions: membership.hoaEligibility.isEligible ? [] : ['alignment'],
        minimumStakeAmounts: membership.minimumStakes,
        stakeAmountLabel: stakeRequirementLabel(membership.minimumStakes, selectedHouse),
        error: null,
      }))
    } catch (err: unknown) {
      setState((previous) => ({
        ...previous,
        status: 'friendly_error',
        address: account,
        chainId,
        error: friendlyGovernanceError(err),
      }))
    }
  }, [account, addresses, chainId, publicClient, state.selectedHouse])

  useEffect(() => {
    void loadRuntimeState()
  }, [loadRuntimeState])

  useEffect(() => {
    if (!account || chainId !== CELO_CHAIN_ID || !addresses.houses) return undefined
    const interval = globalThis.setInterval(() => {
      void loadRuntimeState()
    }, 30_000)
    return () => globalThis.clearInterval(interval)
  }, [account, addresses.houses, chainId, loadRuntimeState])

  const switchToCelo = useCallback(async () => {
    try {
      await requestCeloMainnetSwitch(provider)
    } finally {
      await loadRuntimeState()
    }
  }, [loadRuntimeState, provider])

  const selectHouse = useCallback((house: GovernanceHouse) => {
    setState((previous) => ({
      ...previous,
      selectedHouse: house,
      stakeAmountLabel: formatStakeAmount(previous.minimumStakeAmounts[house]),
    }))
  }, [])

  const register = useCallback(
    async (profileDraft: GovernanceProfileDraft) => {
      if (!account || !addresses.houses) return
      const walletClient = createGovernanceWalletClient({ provider, account })
      if (!walletClient) return

      setState((previous) => ({
        ...previous,
        onboardingStepId: 'stake',
        profileDraft,
        transactionSteps: createTransactionSteps('wallet_confirmation'),
        error: null,
      }))

      try {
        const selectedHouse = state.selectedHouse
        const hash = await registerWithTransferAndCall({
          publicClient,
          walletClient,
          account,
          addresses: { ...addresses, houses: addresses.houses },
          selectedHouse,
          profileDraft,
          stakeAmountWei: state.minimumStakeAmounts[selectedHouse],
          onStage: (stage, hash) => setState((previous) => ({ ...previous, ...transactionStageToStep(stage, hash) })),
        })

        setState((previous) => ({
          ...previous,
          registrationHash: hash,
          transactionSteps: createTransactionSteps('confirmed'),
          onboardingStepId: 'success',
        }))
        await loadRuntimeState()
      } catch (err: unknown) {
        setState((previous) => ({
          ...previous,
          status: 'onboarding_required',
          error: friendlyGovernanceError(err),
          transactionSteps: createTransactionSteps('failed', friendlyGovernanceError(err)),
        }))
      }
    },
    [account, addresses, loadRuntimeState, provider, publicClient, state.minimumStakeAmounts, state.selectedHouse],
  )

  const restake = useCallback(async () => {
    if (!account || !addresses.houses) return
    const walletClient = createGovernanceWalletClient({ provider, account })
    if (!walletClient) return
    const house = state.member?.house ?? state.selectedHouse

    try {
      const hash = await restakeWithTransferAndCall({
        publicClient,
        walletClient,
        account,
        addresses: { ...addresses, houses: addresses.houses },
        stakeAmountWei: state.minimumStakeAmounts[house],
        onStage: (stage, hash) => setState((previous) => ({ ...previous, ...transactionStageToStep(stage, hash) })),
      })
      setState((previous) => ({ ...previous, registrationHash: hash, error: null }))
      await loadRuntimeState()
    } catch (err: unknown) {
      setState((previous) => ({
        ...previous,
        status: 'restake_required',
        error: friendlyGovernanceError(err),
        transactionSteps: createTransactionSteps('failed', friendlyGovernanceError(err)),
      }))
    }
  }, [account, addresses, loadRuntimeState, provider, publicClient, state.member?.house, state.minimumStakeAmounts, state.selectedHouse])

  const openVote = useCallback(() => {
    setState((previous) => ({ ...previous, status: 'vote_detail' }))
  }, [])

  const closeVote = useCallback(() => {
    setState((previous) => ({
      ...previous,
      status: previous.member ? statusFromMember(previous.member) : 'disconnected',
    }))
  }, [])

  const setVoteAllocation = useCallback((recipientId: string, basisPoints: number) => {
    setState((previous) => {
      const allocationsBps = {
        ...previous.dashboard.alignmentVoting.allocationsBps,
        [recipientId]: Math.max(0, Math.min(10000, basisPoints)),
      }
      const allocationTotalBps = Object.values(allocationsBps).reduce((total, amount) => total + amount, 0)
      return {
        ...previous,
        dashboard: {
          ...previous.dashboard,
          alignmentVoting: {
            ...previous.dashboard.alignmentVoting,
            allocationsBps,
            allocationTotalBps,
            disabledReason: allocationTotalBps === 10000 ? previous.dashboard.alignmentVoting.disabledReason : 'Allocation totals must equal exactly 10,000 basis points.',
          },
        },
      }
    })
  }, [])

  const submitVote = useCallback(async () => {
    const vote = state.dashboard.alignmentVoting
    if (!account || !addresses.houses || vote.allocationTotalBps !== 10000) return
    const walletClient = createGovernanceWalletClient({ provider, account })
    if (!walletClient) return

    try {
      const recipients = vote.options
        .map((option) => option.id)
        .filter((recipient): recipient is Address => isAddress(recipient))
        .map((recipient) => getAddress(recipient))
      const allocations = recipients.map((recipient) => BigInt(vote.allocationsBps[recipient] ?? 0))
      await castGovernanceVote({
        publicClient,
        walletClient,
        account,
        housesAddress: addresses.houses,
        recipients,
        allocationsBps: allocations,
      })
      setState((previous) => ({
        ...previous,
        dashboard: {
          ...previous.dashboard,
          alignmentVoting: { ...previous.dashboard.alignmentVoting, hasVoted: true, canVote: false, disabledReason: 'You already voted in this allocation cycle.' },
        },
      }))
      await loadRuntimeState()
    } catch (err: unknown) {
      setState((previous) => ({ ...previous, status: 'friendly_error', error: friendlyGovernanceError(err) }))
    }
  }, [account, addresses.houses, loadRuntimeState, provider, publicClient, state.dashboard.alignmentVoting])

  const startIdentityVerification = useCallback(async () => {
    if (!account) return
    const walletClient = createGovernanceWalletClient({ provider, account })
    if (!walletClient) return

    const identitySdk = createGovernanceIdentitySdk({
      publicClient,
      walletClient,
      environment,
    })
    const returnUrl = typeof window !== 'undefined' ? window.location.href : undefined
    const identityVerificationUrl = await createGovernanceIdentityVerificationLink({
      identitySdk,
      returnUrl,
      chainId: chainId ?? undefined,
    })
    setState((previous) => ({ ...previous, identityVerificationUrl }))
    if (typeof window !== 'undefined') {
      window.open(identityVerificationUrl, '_blank', 'noopener,noreferrer')
    }
  }, [account, chainId, environment, provider, publicClient])

  const actions = useMemo<GovernanceWidgetAdapterActions>(
    () => ({
      connect,
      switchToCelo,
      refresh: loadRuntimeState,
      retry: loadRuntimeState,
      selectHouse,
      register,
      restake,
      openVote,
      closeVote,
      setVoteAllocation,
      submitVote,
      startIdentityVerification,
    }),
    [
      closeVote,
      connect,
      loadRuntimeState,
      openVote,
      register,
      restake,
      selectHouse,
      setVoteAllocation,
      startIdentityVerification,
      submitVote,
      switchToCelo,
    ],
  )

  const resolvedState = useMemo(
    () => ({
      ...state,
      address: account,
      chainId: chainId ?? null,
      dashboard: {
        ...state.dashboard,
        impact: {
          ...state.dashboard.impact,
          ctaLabel: 'View Impact Report Q3',
        },
      },
    }),
    [account, chainId, state],
  )

  return { state: resolvedState, actions }
}

export { createDashboardState, createInitialState, friendlyGovernanceError, isActiveStatus }
