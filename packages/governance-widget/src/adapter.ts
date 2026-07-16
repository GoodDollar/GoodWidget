import { useCallback, useMemo } from 'react'
import { useWallet } from '@goodwidget/core'
import { getAddress } from 'viem'
import type { GovernanceDashboardState } from './widgetRuntimeContract'
import type {
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
  requestCeloMainnetSwitch,
  resolveGovernanceAddresses,
} from './sdks/contracts'
import type { GovernanceStakeRequirements } from './sdks/contractReads'
import {
  createTransactionSteps,
  friendlyGovernanceError,
  isActiveStatus,
  useGovernanceMembership,
} from './hooks/useGovernanceMembership'
import {
  createEmptyVotingState,
  useGovernanceVoting,
} from './hooks/useGovernanceVoting'
import {
  createFundingLoadingState,
  useGovernanceFunding,
} from './hooks/useGovernanceFunding'

const IMPACT_METRICS: GovernanceDashboardState['impact'] = {
  title: 'Distributed',
  metrics: [
    { label: 'UBI Pool', amount: { value: '—', token: 'G$' } },
    { label: 'Impact Pool', amount: { value: '—', token: 'G$' } },
  ],
  description:
    'Empowering people worldwide through transparent, decentralized funding for public goods.',
  ctaLabel: 'View Impact Report Q3',
}

const EMPTY_STAKES: GovernanceStakeRequirements = {
  citizenship: 0n,
  alignment: 0n,
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
    alignmentVoting: params.voting ?? createEmptyVotingState(),
    fundingDistribution: params.funding ?? createFundingLoadingState(),
  }
}

function createInitialState(
  status: GovernanceWidgetStatus = 'disconnected',
): GovernanceWidgetAdapterState {
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
    transaction: { kind: null, status: 'idle', hash: null, error: null },
    unstakeAvailability: {
      canUnstake: false,
      unlockAt: null,
      disabledReason: 'Only active members can unstake.',
    },
    lifecycleNotice: null,
    error: null,
  }
}

export function useGovernanceAdapter({
  environment = 'production',
  celoRpcUrl,
  addresses: addressOverrides,
}: GovernanceWidgetAdapterFactoryInput = {}): GovernanceWidgetAdapterResult {
  const { address, chainId, provider, connect } = useWallet()
  const publicClient = useMemo(
    () => createGovernancePublicClient(celoRpcUrl),
    [celoRpcUrl],
  )
  const addresses = useMemo(
    () => resolveGovernanceAddresses(addressOverrides),
    [addressOverrides],
  )
  const account = useMemo(
    () => address ? getAddress(address.toLowerCase()) : null,
    [address],
  )
  const resolvedChainId = chainId ?? null
  const runtimeEnabled = Boolean(
    account && resolvedChainId === CELO_CHAIN_ID && addresses.houses,
  )

  const membership = useGovernanceMembership({
    account,
    chainId: resolvedChainId,
    provider,
    publicClient,
    addresses,
    environment,
  })
  const voting = useGovernanceVoting({
    enabled: runtimeEnabled && Boolean(membership.schedule),
    account,
    provider,
    publicClient,
    addresses,
    member: membership.member,
    identityRoot: membership.identityRoot,
    activeAlignment: membership.activeAlignment,
    schedule: membership.schedule,
  })
  const funding = useGovernanceFunding({
    enabled: runtimeEnabled,
    publicClient,
    housesAddress: addresses.houses,
    tokenAddress: addresses.gToken,
  })

  const refresh = useCallback(async () => {
    await Promise.all([
      membership.refresh(),
      voting.refresh(),
      funding.refresh(),
    ])
  }, [funding, membership, voting])

  const switchToCelo = useCallback(async () => {
    await requestCeloMainnetSwitch(provider)
  }, [provider])

  let status: GovernanceWidgetStatus
  let runtimeError: string | null = null
  if (!account) {
    status = 'disconnected'
  } else if (resolvedChainId !== CELO_CHAIN_ID) {
    status = 'unsupported_chain'
  } else if (!addresses.houses) {
    status = 'friendly_error'
    runtimeError = 'Governance contract address is not configured yet.'
  } else if (membership.isLoading && !membership.membership) {
    status = 'loading'
  } else if (membership.loadError) {
    status = 'friendly_error'
    runtimeError = membership.loadError
  } else {
    status = isActiveStatus(membership.status) && voting.isDetailOpen
      ? 'vote_detail'
      : membership.status
  }

  const transaction = membership.transaction.kind === 'unstake'
    ? membership.transaction
    : voting.transaction.status !== 'idle'
      ? voting.transaction
      : membership.transaction

  const state = useMemo<GovernanceWidgetAdapterState>(() => ({
    status,
    address: account,
    chainId: resolvedChainId,
    identityStatus: membership.identityStatus,
    identityVerificationUrl: membership.identityVerificationUrl,
    member: membership.member,
    dashboard: createDashboardState({
      activeMemberCount:
        membership.activeCitizens.length + membership.activeAlignment.length,
      voting: voting.voting,
      funding: funding.funding,
    }),
    selectedHouse: membership.selectedHouse,
    disabledHouseOptions: membership.hoaEligibility?.isEligible ? [] : ['alignment'],
    onboardingStepId: membership.onboardingStepId,
    profileDraft: membership.profileDraft,
    stakeAmountLabel: membership.stakeAmountLabel,
    minimumStakeAmounts: membership.minimumStakes,
    transactionSteps: membership.transactionSteps,
    registrationHash: membership.transaction.kind === 'registration'
      ? membership.transaction.hash
      : null,
    transaction,
    unstakeAvailability: membership.unstakeAvailability,
    lifecycleNotice: membership.lifecycleNotice,
    error: runtimeError ?? transaction.error ?? membership.error ?? voting.error,
  }), [
    account,
    funding.funding,
    membership.activeAlignment.length,
    membership.activeCitizens.length,
    membership.hoaEligibility?.isEligible,
    membership.identityStatus,
    membership.identityVerificationUrl,
    membership.lifecycleNotice,
    membership.error,
    membership.member,
    membership.minimumStakes,
    membership.onboardingStepId,
    membership.profileDraft,
    membership.selectedHouse,
    membership.stakeAmountLabel,
    membership.transaction,
    membership.transactionSteps,
    membership.unstakeAvailability,
    resolvedChainId,
    runtimeError,
    status,
    transaction,
    voting.error,
    voting.voting,
  ])

  const actions = useMemo<GovernanceWidgetAdapterActions>(() => ({
    connect,
    switchToCelo,
    refresh,
    retry: refresh,
    selectHouse: membership.selectHouse,
    register: membership.register,
    unstake: membership.unstake,
    openVote: voting.openVote,
    closeVote: voting.closeVote,
    setVoteAllocation: voting.setVoteAllocation,
    submitVote: voting.submitVote,
    startIdentityVerification: membership.startIdentityVerification,
  }), [
    connect,
    membership.register,
    membership.selectHouse,
    membership.startIdentityVerification,
    membership.unstake,
    refresh,
    switchToCelo,
    voting.closeVote,
    voting.openVote,
    voting.setVoteAllocation,
    voting.submitVote,
  ])

  return { state, actions }
}

export {
  createDashboardState,
  createInitialState,
  friendlyGovernanceError,
  isActiveStatus,
}
