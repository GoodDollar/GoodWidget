import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet } from '@goodwidget/core'
import type { Address } from 'viem'
import type { StepperStepItem } from '@goodwidget/ui'
import type { GovernanceHouse, GovernanceProfileDraft } from './types'
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
  createGovernancePublicClient,
  createGovernanceWalletClient,
  GOODDAO_HOUSES_ABI,
  houseToContractValue,
  mapMemberRecord,
  parseStakeAmountLabelToWei,
  readGoodIdVerification,
  readMinimumStakeLabel,
  registerWithTransferAndCall,
  requestCeloMainnetSwitch,
  resolveGovernanceAddresses,
  type GovernanceMemberRecord,
} from './sdks/contracts'
import { createGovernanceIdentitySdk, createGovernanceIdentityVerificationLink } from './sdks/identity'

const IMPACT_METRICS: GovernanceDashboardState['impact'] = {
  title: 'Distributed',
  metrics: [
    { label: 'UBI Pool', amount: { value: 12400000, token: 'G$' } },
    {
      label: 'Impact Pool',
      amount: { value: 5234891, token: 'G$', isStreaming: true, streamLabel: 'Live stream active' },
    },
  ],
  description:
    'Empowering 640k+ people worldwide through transparent, decentralized funding for public goods.',
}

const DEFAULT_VOTE_OPTIONS = [
  { id: 'food-chain', label: 'Local Food Chain', percentage: 42 },
  { id: 'web3-literacy', label: 'Web3 Literacy', percentage: 31 },
  { id: 'civic-onboarding', label: 'Civic Onboarding', percentage: 27 },
]

const DEFAULT_FUNDING_PROJECTS = [
  { id: 'education', name: 'Education Hubs', amount: { value: 157500, token: 'G$' }, percentage: 35 },
  { id: 'merchant', name: 'Merchant Onboard', amount: { value: 112500, token: 'G$' }, percentage: 25 },
  { id: 'grants', name: 'Dev Grants', amount: { value: 90000, token: 'G$' }, percentage: 20 },
  { id: 'creator', name: 'Creator Fund', amount: { value: 90000, token: 'G$' }, percentage: 20 },
]

function createTransactionSteps(activeStepId: string, failedMessage?: string): StepperStepItem[] {
  const stepOrder = ['prepare', 'approve', 'stake', 'finalize']
  const activeIndex = stepOrder.indexOf(activeStepId)

  return [
    {
      id: 'prepare',
      title: 'Prepare wallet balance',
      description: 'Keep the required G$ amount available before the staking transaction starts.',
      status: activeIndex > 0 ? 'completed' : activeIndex === 0 ? 'active' : 'pending',
    },
    {
      id: 'approve',
      title: 'Approve governance stake',
      description: 'Confirm the G$ transferAndCall transaction from your wallet.',
      status: activeIndex > 1 ? 'completed' : activeIndex === 1 ? 'active' : 'pending',
    },
    {
      id: 'stake',
      title: 'Lock the membership stake',
      description: failedMessage,
      status: failedMessage ? 'failed' : activeIndex > 2 ? 'completed' : activeIndex === 2 ? 'active' : 'pending',
    },
    {
      id: 'finalize',
      title: 'Finalize governance access',
      status: activeIndex > 3 ? 'completed' : activeIndex === 3 ? 'active' : 'pending',
    },
  ]
}

function createDashboardState(activeMemberCount = 12402): GovernanceDashboardState {
  const alignmentVoting: GovernanceVotingState = {
    voteId: 'alignment-current',
    title: 'Q3 House Of Alignment Funding Allocation',
    summaryLabel: 'Current top 3 voted',
    options: DEFAULT_VOTE_OPTIONS,
    recipients: [],
    allocationsBps: {
      'food-chain': 4200,
      'web3-literacy': 3100,
      'civic-onboarding': 2700,
    },
    allocationTotalBps: 10000,
    canVote: false,
    hasVoted: false,
    isVotingOpen: true,
    executed: false,
    disabledReason: 'Connect as an active Alignment member to vote.',
  }

  return {
    impact: IMPACT_METRICS,
    activeMembers: {
      icon: 'check',
      title: 'Active Members',
      amount: activeMemberCount,
      amountType: 'raw',
      metadataType: 'time-window',
      metadata: { label: 'Active members only', tone: 'muted', icon: 'info' },
    },
    alignmentVoting,
    fundingDistribution: {
      title: 'Funding distribution',
      centerLabel: 'Mocked pool total',
      totalAmount: { value: 450000, token: 'G$', isStreaming: true, streamLabel: 'Mock pool data' },
      projects: DEFAULT_FUNDING_PROJECTS,
      isStreaming: true,
      emptyStateLabel: 'No active funding distribution yet.',
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
    stakeAmountLabel: '250 G$',
    transactionSteps: createTransactionSteps('approve'),
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
  if (message.includes('insufficient funds')) {
    return 'Your wallet does not have enough funds for this governance action.'
  }
  if (message.includes('whitelist') || message.includes('not allowed')) {
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
      const [memberResult, citizenshipStake, alignmentStake, citizenshipMembers, alignmentMembers, isVerified] =
        await Promise.all([
          publicClient.readContract({
            address: addresses.houses,
            abi: GOODDAO_HOUSES_ABI,
            functionName: 'getMember',
            args: [account],
          }),
          readMinimumStakeLabel(publicClient, addresses.houses, 'citizenship'),
          readMinimumStakeLabel(publicClient, addresses.houses, 'alignment'),
          publicClient.readContract({
            address: addresses.houses,
            abi: GOODDAO_HOUSES_ABI,
            functionName: 'getActiveMembers',
            args: [houseToContractValue('citizenship')],
          }),
          publicClient.readContract({
            address: addresses.houses,
            abi: GOODDAO_HOUSES_ABI,
            functionName: 'getActiveMembers',
            args: [houseToContractValue('alignment')],
          }),
          readGoodIdVerification(publicClient, addresses.goodId, account),
        ])

      const member = mapMemberRecord(memberResult)
      const status = statusFromMember(member)
      const activeMemberCount = citizenshipMembers.length + alignmentMembers.length
      const dashboard = createDashboardState(activeMemberCount)
      const selectedHouse = member.house ?? 'citizenship'
      dashboard.alignmentVoting.canVote = status === 'active_alignment'
      dashboard.alignmentVoting.disabledReason = dashboard.alignmentVoting.canVote
        ? undefined
        : 'Only active House of Alignment members can vote.'

      setState((previous) => ({
        ...previous,
        status,
        address: account,
        chainId,
        identityStatus: isVerified ? 'verified' : 'unverified',
        member,
        dashboard,
        selectedHouse,
        disabledHouseOptions: isVerified ? [] : ['alignment'],
        stakeAmountLabel: selectedHouse === 'alignment' ? alignmentStake.label : citizenshipStake.label,
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
  }, [account, addresses, chainId, publicClient])

  useEffect(() => {
    void loadRuntimeState()
  }, [loadRuntimeState])

  const switchToCelo = useCallback(async () => {
    try {
      await requestCeloMainnetSwitch(provider)
    } finally {
      await loadRuntimeState()
    }
  }, [loadRuntimeState, provider])

  const selectHouse = useCallback(
    (house: GovernanceHouse) => {
      setState((previous) => ({
        ...previous,
        selectedHouse: house,
        stakeAmountLabel: house === 'alignment' ? previous.stakeAmountLabel : previous.stakeAmountLabel,
      }))
    },
    [],
  )

  const register = useCallback(
    async (profileDraft: GovernanceProfileDraft) => {
      if (!account || !addresses.houses) return
      const walletClient = createGovernanceWalletClient({ provider, account })
      if (!walletClient) return

      setState((previous) => ({
        ...previous,
        onboardingStepId: 'stake',
        profileDraft,
        transactionSteps: createTransactionSteps('approve'),
        error: null,
      }))

      try {
        const hash = await registerWithTransferAndCall({
          walletClient,
          account,
          addresses: { ...addresses, houses: addresses.houses },
          selectedHouse: state.selectedHouse,
          profileDraft,
          stakeAmountWei: parseStakeAmountLabelToWei(state.stakeAmountLabel),
        })

        setState((previous) => ({
          ...previous,
          registrationHash: hash,
          transactionSteps: createTransactionSteps('finalize').map((step) => ({ ...step, status: 'completed' })),
          onboardingStepId: 'success',
        }))
        await loadRuntimeState()
      } catch (err: unknown) {
        setState((previous) => ({
          ...previous,
          status: 'onboarding_required',
          error: friendlyGovernanceError(err),
          transactionSteps: createTransactionSteps('stake', friendlyGovernanceError(err)),
        }))
      }
    },
    [account, addresses, loadRuntimeState, provider, state.selectedHouse, state.stakeAmountLabel],
  )

  const restake = useCallback(async () => {
    if (!account || !addresses.houses) return
    const walletClient = createGovernanceWalletClient({ provider, account })
    if (!walletClient) return

    try {
      const hash = await walletClient.writeContract({
        account,
        chain: undefined,
        address: addresses.houses,
        abi: GOODDAO_HOUSES_ABI,
        functionName: 'stake',
        args: [parseStakeAmountLabelToWei(state.stakeAmountLabel)],
      })
      setState((previous) => ({ ...previous, registrationHash: hash, error: null }))
      await loadRuntimeState()
    } catch (err: unknown) {
      setState((previous) => ({ ...previous, status: 'friendly_error', error: friendlyGovernanceError(err) }))
    }
  }, [account, addresses.houses, loadRuntimeState, provider, state.stakeAmountLabel])

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
          },
        },
      }
    })
  }, [])

  const submitVote = useCallback(async () => {
    if (!account || !addresses.houses || state.dashboard.alignmentVoting.allocationTotalBps !== 10000) return
    const walletClient = createGovernanceWalletClient({ provider, account })
    if (!walletClient) return

    try {
      const recipients = state.dashboard.alignmentVoting.options.map((option) => option.id as Address)
      const allocations = state.dashboard.alignmentVoting.options.map(
        (option) => BigInt(state.dashboard.alignmentVoting.allocationsBps[option.id] ?? 0),
      )
      await walletClient.writeContract({
        account,
        chain: undefined,
        address: addresses.houses,
        abi: GOODDAO_HOUSES_ABI,
        functionName: 'castVote',
        args: [recipients, allocations],
      })
      setState((previous) => ({
        ...previous,
        dashboard: {
          ...previous.dashboard,
          alignmentVoting: { ...previous.dashboard.alignmentVoting, hasVoted: true, canVote: false },
        },
      }))
    } catch (err: unknown) {
      setState((previous) => ({ ...previous, status: 'friendly_error', error: friendlyGovernanceError(err) }))
    }
  }, [account, addresses.houses, provider, state.dashboard.alignmentVoting])

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
