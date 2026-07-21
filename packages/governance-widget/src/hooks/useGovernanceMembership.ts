import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Linking } from 'react-native'
import type { EIP1193Provider } from '@goodwidget/core'
import type { StepperStepItem } from '@goodwidget/ui'
import type { Address, Hex, PublicClient } from 'viem'
import type { GovernanceHouse, GovernanceOnboardingStepId, GovernanceProfileDraft } from '../types'
import type {
  GovernanceTransactionState,
  GovernanceTransactionStatus,
  GovernanceUnstakeAvailability,
  GovernanceWidgetStatus,
} from '../widgetRuntimeContract'
import {
  CELO_CHAIN_ID,
  createGovernanceWalletClient,
  formatStakeAmount,
  safeMillisecondsFromSeconds,
  type GovernanceContractAddresses,
  type GovernanceMemberRecord,
} from '../sdks/contracts'
import {
  readGovernanceMembership,
  readGovernanceSchedule,
  type GovernanceMembershipReads,
  type GovernanceSchedule,
  type GovernanceStakeRequirements,
} from '../sdks/contractReads'
import {
  registerWithTransferAndCall,
  unstakeGovernanceMembership,
  type GovernanceTransactionStage,
} from '../sdks/transactions'
import {
  createGovernanceIdentitySdk,
  createGovernanceIdentityVerificationLink,
  type GovernanceIdentityEnvironment,
} from '../sdks/identity'
import { useGovernanceTransactionGuard } from './useGovernanceTransactionGuard'

const EMPTY_STAKES: GovernanceStakeRequirements = {
  citizenship: 0n,
  alignment: 0n,
}

const EMPTY_ADDRESSES: Address[] = []

const IDLE_TRANSACTION: GovernanceTransactionState = {
  kind: null,
  status: 'idle',
  hash: null,
  error: null,
}

export function createTransactionSteps(
  stage: GovernanceTransactionStatus,
  failedMessage?: string,
): StepperStepItem[] {
  const rejected = stage === 'rejected'
  const reverted = stage === 'reverted' || stage === 'failed'

  return [
    {
      id: 'prepare',
      title: 'Prepare wallet balance',
      description: 'Keep the required G$ amount available before the membership transaction starts.',
      status: stage === 'idle' ? 'active' : 'completed',
    },
    {
      id: 'approve',
      title: 'Confirm in wallet',
      description: rejected ? failedMessage : 'Approve the membership transaction from your wallet.',
      status: rejected ? 'failed' : stage === 'wallet_confirmation' ? 'active' : stage === 'idle' ? 'pending' : 'completed',
    },
    {
      id: 'stake',
      title: 'Transaction submitted',
      description: reverted ? failedMessage : 'Wait for the Celo transaction receipt before continuing.',
      status: reverted ? 'failed' : stage === 'submitted' ? 'active' : stage === 'confirmed' ? 'completed' : 'pending',
    },
    {
      id: 'finalize',
      title: 'Confirmed on-chain',
      status: stage === 'confirmed' ? 'completed' : 'pending',
    },
  ]
}

export function friendlyGovernanceError(err: unknown): string {
  if (!(err instanceof Error)) return 'Something went wrong. Please try again.'

  const message = err.message
  if (message.includes('User rejected') || message.includes('4001')) {
    return 'Transaction rejected in the wallet.'
  }
  if (message.includes('Already voted')) return 'You already voted in this allocation cycle.'
  if (message.includes('Alloc != 10000')) return 'Allocation totals must equal exactly 10,000 basis points.'
  if (message.includes('insufficient funds')) {
    return 'Your wallet does not have enough funds for this governance action.'
  }
  if (message.includes('Not HoA eligible')) {
    return 'This wallet is not currently eligible for House of Alignment registration.'
  }
  if (message.includes('Term not passed')) {
    return 'Your membership is still locked for the current governance term.'
  }
  if (message.includes('revert') || message.includes('reverted')) {
    return 'The governance contract rejected this action. Review your details and try again.'
  }
  if (message.includes('fetch') || message.includes('network') || message.includes('HTTP')) {
    return 'Unable to reach Celo Mainnet. Check your connection and try again.'
  }
  return 'Unable to complete the governance action. Please try again.'
}

export function transactionStatusFromError(err: unknown): Extract<GovernanceTransactionStatus, 'rejected' | 'reverted' | 'failed'> {
  if (err instanceof Error && (err.message.includes('User rejected') || err.message.includes('4001'))) {
    return 'rejected'
  }
  if (err instanceof Error && (err.message.includes('revert') || err.message.includes('reverted'))) {
    return 'reverted'
  }
  return 'failed'
}

export function statusFromMember(member: GovernanceMemberRecord | null): GovernanceWidgetStatus {
  if (!member || member.status === 'none' || member.status === 'unstaked') return 'onboarding_required'
  // GoodDaoHouses activates Citizen registrations immediately; Pending is Alignment-only.
  if (member.status === 'pending' && member.house === 'alignment') return 'pending_alignment'
  if (member.status === 'active' && member.house === 'alignment') return 'active_alignment'
  if (member.status === 'active') return 'active_citizenship'
  if (member.status === 'revoked') return 'revoked'
  return 'onboarding_required'
}

export function isActiveStatus(status: GovernanceWidgetStatus): boolean {
  return status === 'active_alignment' || status === 'active_citizenship'
}

export function getUnstakeAvailability(
  member: GovernanceMemberRecord | null,
  termDurationSeconds: bigint,
  currentBlockTime: number | null,
): GovernanceUnstakeAvailability {
  if (!member || member.status !== 'active') {
    return { canUnstake: false, unlockAt: null, disabledReason: 'Only active members can unstake.' }
  }
  if (!member.updatedAt || termDurationSeconds <= 0n) {
    return {
      canUnstake: false,
      unlockAt: null,
      disabledReason: 'The membership lock period is unavailable. Refresh before trying again.',
    }
  }
  if (currentBlockTime === null) {
    return {
      canUnstake: false,
      unlockAt: null,
      disabledReason: 'The current Celo block time is unavailable. Refresh before trying again.',
    }
  }

  const termDurationMs = safeMillisecondsFromSeconds(termDurationSeconds)
  if (termDurationMs === null) {
    return {
      canUnstake: false,
      unlockAt: null,
      disabledReason: 'The membership lock period is unavailable. Refresh before trying again.',
    }
  }

  const unlockAt = member.updatedAt + termDurationMs
  if (!Number.isSafeInteger(unlockAt)) {
    return {
      canUnstake: false,
      unlockAt: null,
      disabledReason: 'The membership lock period is unavailable. Refresh before trying again.',
    }
  }
  return currentBlockTime >= unlockAt
    ? { canUnstake: true, unlockAt }
    : {
        canUnstake: false,
        unlockAt,
        disabledReason: 'Membership remains locked until the current governance term has passed.',
      }
}

interface MembershipHookState {
  loadedAccount: Address | null
  membership: GovernanceMembershipReads | null
  schedule: GovernanceSchedule | null
  selectedHouse: GovernanceHouse
  onboardingStepId?: GovernanceOnboardingStepId
  profileDraft: GovernanceProfileDraft
  transactionSteps: StepperStepItem[]
  transaction: GovernanceTransactionState
  identityVerificationUrl: string | null
  lifecycleNotice: string | null
  isLoading: boolean
  loadError: string | null
  error: string | null
}

export function resolveRegistrationStake(
  membership: GovernanceMembershipReads | null,
  selectedHouse: GovernanceHouse,
): { stakeAmountWei: bigint; error: null } | { stakeAmountWei: null; error: string } {
  if (!membership) {
    return {
      stakeAmountWei: null,
      error: 'Membership data is still loading. Please try again in a moment.',
    }
  }
  if (selectedHouse === 'alignment' && !membership.hoaEligibility.isEligible) {
    return {
      stakeAmountWei: null,
      error: 'This wallet is not currently eligible for House of Alignment registration.',
    }
  }
  return { stakeAmountWei: membership.minimumStakes[selectedHouse], error: null }
}

function createInitialMembershipState(): MembershipHookState {
  return {
    loadedAccount: null,
    membership: null,
    schedule: null,
    selectedHouse: 'citizenship',
    onboardingStepId: undefined,
    profileDraft: {},
    transactionSteps: createTransactionSteps('idle'),
    transaction: IDLE_TRANSACTION,
    identityVerificationUrl: null,
    lifecycleNotice: null,
    isLoading: false,
    loadError: null,
    error: null,
  }
}

function transactionFromStage(
  kind: GovernanceTransactionState['kind'],
  stage: GovernanceTransactionStage,
  hash?: Hex,
): GovernanceTransactionState {
  return { kind, status: stage, hash: hash ?? null, error: null }
}

export function useGovernanceMembership(params: {
  account: Address | null
  chainId: number | null
  provider: EIP1193Provider | null
  publicClient: PublicClient
  addresses: GovernanceContractAddresses
  environment: GovernanceIdentityEnvironment
}) {
  const { account, chainId, provider, publicClient, addresses, environment } = params
  const [state, setState] = useState<MembershipHookState>(() => createInitialMembershipState())
  const refreshRequestId = useRef(0)
  const transactionGuard = useGovernanceTransactionGuard([
    account?.toLowerCase() ?? 'no-account',
    chainId ?? 'no-chain',
    addresses.houses?.toLowerCase() ?? 'no-contract',
  ].join(':'))
  const enabled = Boolean(account && chainId === CELO_CHAIN_ID && addresses.houses)
  const hasCurrentAccountState = Boolean(
    account && state.loadedAccount?.toLowerCase() === account.toLowerCase(),
  )
  const membership = hasCurrentAccountState ? state.membership : null
  const schedule = hasCurrentAccountState ? state.schedule : null

  const refresh = useCallback(async () => {
    if (!account || !addresses.houses || chainId !== CELO_CHAIN_ID) return
    const requestId = ++refreshRequestId.current
    setState((previous) => ({ ...previous, isLoading: true, loadError: null }))

    try {
      const [membership, schedule] = await Promise.all([
        readGovernanceMembership({
          publicClient,
          housesAddress: addresses.houses,
          goodIdAddress: addresses.goodId,
          account,
        }),
        readGovernanceSchedule({ publicClient, housesAddress: addresses.houses }),
      ])
      setState((previous) => requestId === refreshRequestId.current
        ? {
            ...previous,
            loadedAccount: account,
            membership,
            schedule,
            selectedHouse:
              membership.member.status === 'none' || membership.member.status === 'unstaked'
                ? previous.selectedHouse === 'alignment' && !membership.hoaEligibility.isEligible
                  ? 'citizenship'
                  : previous.selectedHouse
                : membership.member.house,
            isLoading: false,
            loadError: null,
          }
        : previous)
    } catch (err: unknown) {
      setState((previous) => requestId === refreshRequestId.current
        ? {
            ...previous,
            loadedAccount: account,
            isLoading: false,
            loadError: friendlyGovernanceError(err),
          }
        : previous)
    }
  }, [account, addresses.goodId, addresses.houses, chainId, publicClient])

  useEffect(() => {
    refreshRequestId.current += 1
    if (!enabled) {
      setState(createInitialMembershipState())
      return
    }
    setState(createInitialMembershipState())
    void refresh()
  }, [enabled, refresh])

  useEffect(() => {
    if (!enabled) return undefined
    const interval = globalThis.setInterval(() => void refresh(), 30_000)
    return () => globalThis.clearInterval(interval)
  }, [enabled, refresh])

  const selectHouse = useCallback((house: GovernanceHouse) => {
    setState((previous) => ({ ...previous, selectedHouse: house }))
  }, [])

  const register = useCallback(async (profileDraft: GovernanceProfileDraft) => {
    if (!account || !addresses.houses) return
    const selectedHouse = state.selectedHouse
    const registrationStake = resolveRegistrationStake(membership, selectedHouse)
    if (registrationStake.stakeAmountWei === null) {
      setState((previous) => ({
        ...previous,
        error: registrationStake.error,
      }))
      return
    }
    const transactionToken = transactionGuard.begin()
    if (!transactionToken) return

    const walletClient = createGovernanceWalletClient({ provider, account })
    if (!walletClient) {
      const error = 'The connected wallet provider is unavailable.'
      if (transactionGuard.isCurrent(transactionToken)) {
        setState((previous) => ({
          ...previous,
          onboardingStepId: 'stake',
          profileDraft,
          transactionSteps: createTransactionSteps('failed', error),
          transaction: { kind: 'registration', status: 'failed', hash: null, error },
          error,
        }))
      }
      transactionGuard.finish(transactionToken)
      return
    }

    const stakeAmountWei = registrationStake.stakeAmountWei
    setState((previous) => ({
      ...previous,
      onboardingStepId: 'stake',
      profileDraft,
      transactionSteps: createTransactionSteps('wallet_confirmation'),
      transaction: transactionFromStage('registration', 'wallet_confirmation'),
      lifecycleNotice: null,
      error: null,
    }))

    try {
      const hash = await registerWithTransferAndCall({
        publicClient,
        walletClient,
        account,
        addresses: { ...addresses, houses: addresses.houses },
        selectedHouse,
        profileDraft,
        stakeAmountWei,
        onStage: (stage, stageHash) => {
          if (!transactionGuard.isCurrent(transactionToken)) return
          setState((previous) => ({
            ...previous,
            transaction: transactionFromStage('registration', stage, stageHash),
            transactionSteps: createTransactionSteps(stage),
          }))
        },
      })
      if (!transactionGuard.isCurrent(transactionToken)) return
      setState((previous) => ({
        ...previous,
        transaction: { kind: 'registration', status: 'confirmed', hash, error: null },
        transactionSteps: createTransactionSteps('confirmed'),
        onboardingStepId: 'success',
      }))
      await refresh()
    } catch (err: unknown) {
      if (!transactionGuard.isCurrent(transactionToken)) return
      const status = transactionStatusFromError(err)
      const error = friendlyGovernanceError(err)
      setState((previous) => ({
        ...previous,
        transaction: { kind: 'registration', status, hash: previous.transaction.hash, error },
        transactionSteps: createTransactionSteps(status, error),
        error,
      }))
    } finally {
      transactionGuard.finish(transactionToken)
    }
  }, [account, addresses, membership, provider, publicClient, refresh, state.selectedHouse, transactionGuard])

  const unstake = useCallback(async () => {
    if (!account || !addresses.houses) return
    const availability = getUnstakeAvailability(
      membership?.member ?? null,
      schedule?.termDurationSeconds ?? 0n,
      schedule?.currentBlockTime ?? null,
    )
    if (!availability.canUnstake) return
    const transactionToken = transactionGuard.begin()
    if (!transactionToken) return

    const walletClient = createGovernanceWalletClient({ provider, account })
    if (!walletClient) {
      const error = 'The connected wallet provider is unavailable.'
      if (transactionGuard.isCurrent(transactionToken)) {
        setState((previous) => ({
          ...previous,
          transaction: { kind: 'unstake', status: 'failed', hash: null, error },
          error,
        }))
      }
      transactionGuard.finish(transactionToken)
      return
    }

    setState((previous) => ({
      ...previous,
      transaction: transactionFromStage('unstake', 'wallet_confirmation'),
      lifecycleNotice: null,
      error: null,
    }))

    try {
      const hash = await unstakeGovernanceMembership({
        publicClient,
        walletClient,
        account,
        housesAddress: addresses.houses,
        onStage: (stage, stageHash) => {
          if (!transactionGuard.isCurrent(transactionToken)) return
          setState((previous) => ({
            ...previous,
            transaction: transactionFromStage('unstake', stage, stageHash),
          }))
        },
      })
      if (!transactionGuard.isCurrent(transactionToken)) return
      setState((previous) => ({
        ...previous,
        transaction: { kind: 'unstake', status: 'confirmed', hash, error: null },
        lifecycleNotice: 'Membership unstaked successfully. You can now join a governance house again.',
      }))
      await refresh()
    } catch (err: unknown) {
      if (!transactionGuard.isCurrent(transactionToken)) return
      const status = transactionStatusFromError(err)
      const error = friendlyGovernanceError(err)
      setState((previous) => ({
        ...previous,
        transaction: { kind: 'unstake', status, hash: previous.transaction.hash, error },
        error,
      }))
    } finally {
      transactionGuard.finish(transactionToken)
    }
  }, [
    account,
    addresses.houses,
    membership?.member,
    provider,
    publicClient,
    refresh,
    schedule?.currentBlockTime,
    schedule?.termDurationSeconds,
    transactionGuard,
  ])

  const startIdentityVerification = useCallback(async () => {
    if (!account) return
    const walletClient = createGovernanceWalletClient({ provider, account })
    if (!walletClient) {
      setState((previous) => ({ ...previous, error: 'The connected wallet provider is unavailable.' }))
      return
    }

    try {
      setState((previous) => ({ ...previous, error: null }))
      const identitySdk = createGovernanceIdentitySdk({ publicClient, walletClient, environment })
      const returnUrl = (await Linking.getInitialURL()) ?? undefined
      const identityVerificationUrl = await createGovernanceIdentityVerificationLink({
        identitySdk,
        returnUrl,
        chainId: chainId ?? undefined,
      })
      setState((previous) => ({ ...previous, identityVerificationUrl }))
      await Linking.openURL(identityVerificationUrl)
    } catch (err: unknown) {
      setState((previous) => ({ ...previous, error: friendlyGovernanceError(err) }))
    }
  }, [account, chainId, environment, provider, publicClient])

  const minimumStakes = membership?.minimumStakes ?? EMPTY_STAKES
  const member = membership?.member ?? null
  const status = statusFromMember(member)
  const unstakeAvailability = useMemo(
    () => getUnstakeAvailability(
      member,
      schedule?.termDurationSeconds ?? 0n,
      schedule?.currentBlockTime ?? null,
    ),
    [member, schedule?.currentBlockTime, schedule?.termDurationSeconds],
  )

  return {
    ...state,
    membership,
    schedule,
    isLoading: enabled && !hasCurrentAccountState ? true : state.isLoading,
    status,
    member,
    minimumStakes,
    stakeAmountLabel: formatStakeAmount(minimumStakes[state.selectedHouse]),
    identityRoot: membership?.identityRoot ?? null,
    identityStatus: membership?.identityRoot && membership.identityRoot !== '0x0000000000000000000000000000000000000000'
      ? 'verified' as const
      : 'unverified' as const,
    hoaEligibility: membership?.hoaEligibility ?? null,
    activeCitizens: membership?.activeCitizens ?? EMPTY_ADDRESSES,
    activeAlignment: membership?.activeAlignment ?? EMPTY_ADDRESSES,
    unstakeAvailability,
    refresh,
    selectHouse,
    register,
    unstake,
    startIdentityVerification,
  }
}
