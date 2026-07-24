import React, { useCallback, useMemo, useState } from 'react'
import { zeroAddress, zeroHash, type Address } from 'viem'
import { GoodWidgetProvider } from '@goodwidget/core'
import {
  encodeInviteCode,
  InviteRewards,
  InviteRuntimeContext,
  type InviteActions,
  type InviteAdapterResult,
  type InviteState,
} from '@goodwidget/citizen-claim-widget'

// ---------------------------------------------------------------------------
// Deterministic fixture data — stable addresses/amounts so screenshots and
// Playwright assertions never depend on live wallet/RPC state.
// ---------------------------------------------------------------------------

export const MOCK_INVITER_ADDRESS = '0x4444444444444444444444444444444444444444' as Address
const APPROVED_INVITEE = '0x1111111111111111111111111111111111111111' as Address
const WAITING_INVITEE = '0x2222222222222222222222222222222222222222' as Address
const COLLECTABLE_INVITEE = '0x3333333333333333333333333333333333333333' as Address
const MY_CODE = encodeInviteCode('mycode1234')

function baseUser(overrides: Partial<NonNullable<InviteState['user']>> = {}) {
  return {
    invitedBy: zeroAddress,
    inviteCode: MY_CODE,
    bountyPaid: false,
    level: 0n,
    levelStarted: 0n,
    totalApprovedInvites: 1n,
    totalEarned: 50_000_000_000_000_000_000n, // 50 G$ at 18 decimals
    joinedAt: 1_700_000_000n,
    bountyAtJoin: 100_000_000_000_000_000_000n,
    ...overrides,
  }
}

const waitingDetails = {
  isActive: true,
  inviteeWhitelisted: false,
  inviterWhitelisted: true,
  minimumClaims: 5,
  minimumDays: 3,
  reverificationDue: false,
}

const collectableDetails = {
  ...waitingDetails,
  inviteeWhitelisted: true,
}

function baseState(overrides: Partial<InviteState> = {}): InviteState {
  return {
    status: 'ready',
    address: MOCK_INVITER_ADDRESS,
    chainId: 42220,
    user: baseUser(),
    level: { toNext: 5n, bounty: 100_000_000_000_000_000_000n, daysToComplete: 30n },
    invitees: [APPROVED_INVITEE, WAITING_INVITEE, COLLECTABLE_INVITEE],
    pendingInvitees: [WAITING_INVITEE, COLLECTABLE_INVITEE],
    collectableInvitees: [COLLECTABLE_INVITEE],
    eligibility: {
      [WAITING_INVITEE]: waitingDetails,
      [COLLECTABLE_INVITEE]: collectableDetails,
    },
    selfEligibility: { ...collectableDetails, inviterWhitelisted: null },
    error: null,
    success: null,
    ...overrides,
  }
}

export const inviteRewardsFixtures = {
  loading: (): InviteState => ({ ...baseState(), status: 'loading' }),
  disconnected: (): InviteState => ({ ...baseState(), status: 'disconnected', address: null, user: null }),
  unsupported: (): InviteState => ({ ...baseState(), status: 'unsupported', chainId: 1, user: null }),
  errorNoData: (): InviteState => ({
    ...baseState(),
    status: 'error',
    user: null,
    invitees: [],
    pendingInvitees: [],
    collectableInvitees: [],
    eligibility: {},
    error: 'Unable to reach the network. Check your connection and try again.',
  }),
  empty: (): InviteState =>
    baseState({
      user: baseUser({ inviteCode: zeroHash, totalApprovedInvites: 0n, totalEarned: 0n }),
      invitees: [],
      pendingInvitees: [],
      collectableInvitees: [],
      eligibility: {},
      selfEligibility: { ...waitingDetails, inviteeWhitelisted: true, inviterWhitelisted: null },
    }),
  pendingOnly: (): InviteState =>
    baseState({
      invitees: [APPROVED_INVITEE, WAITING_INVITEE],
      pendingInvitees: [WAITING_INVITEE],
      collectableInvitees: [],
      eligibility: { [WAITING_INVITEE]: waitingDetails },
    }),
  collectable: (): InviteState => baseState(),
  joinSuccess: (): InviteState =>
    baseState({
      // Inviter already attached — the join card is hidden — yet the success
      // banner from the join action must remain visible (acceptance criterion).
      user: baseUser({ invitedBy: APPROVED_INVITEE }),
      success: 'Joined inviter successfully.',
    }),
  collectSuccess: (): InviteState =>
    baseState({
      pendingInvitees: [WAITING_INVITEE],
      collectableInvitees: [],
      eligibility: { [WAITING_INVITEE]: waitingDetails },
      success: 'Invite rewards collected successfully.',
    }),
  collectError: (): InviteState =>
    baseState({
      error: 'Invite transaction failed. Please retry.',
    }),
}

// ---------------------------------------------------------------------------
// Stateful mock runtime — a real hook so Storybook play functions / Playwright
// interactions can drive join/collect through the same UI action path.
// ---------------------------------------------------------------------------

export interface MockInviteRuntimeOptions {
  joinShouldFail?: boolean
  collectShouldFail?: boolean
}

function useMockInviteRuntime(
  initialState: InviteState,
  options: MockInviteRuntimeOptions = {},
): InviteAdapterResult {
  const [state, setState] = useState<InviteState>(initialState)

  const refresh = useCallback(async () => {}, [])

  const validateCode = useCallback(async (code: string): Promise<string> => {
    const normalized = code.trim()
    if (!normalized) throw new Error('This invite code was not found.')
    if (normalized === 'INVALID') throw new Error('This invite code was not found.')
    return normalized
  }, [])

  const join = useCallback(
    async (inviterCode?: string) => {
      setState((current) => ({ ...current, status: 'joining', error: null, success: null }))
      await new Promise((resolve) => setTimeout(resolve, 30))
      if (options.joinShouldFail) {
        setState((current) => ({
          ...current,
          status: 'ready',
          error: 'You have already joined an inviter.',
          success: null,
        }))
        return
      }
      setState((current) => ({
        ...current,
        status: 'ready',
        user: current.user
          ? {
              ...current.user,
              invitedBy: inviterCode ? MOCK_INVITER_ADDRESS : current.user.invitedBy,
              inviteCode: current.user.inviteCode === zeroHash ? MY_CODE : current.user.inviteCode,
            }
          : current.user,
        error: null,
        success: inviterCode ? 'Joined inviter successfully.' : 'Invite code created successfully.',
      }))
    },
    [options.joinShouldFail],
  )

  const collectAll = useCallback(async () => {
    setState((current) => ({ ...current, status: 'collecting', error: null, success: null }))
    await new Promise((resolve) => setTimeout(resolve, 30))
    if (options.collectShouldFail) {
      setState((current) => ({
        ...current,
        status: 'ready',
        error: 'Invite transaction failed. Please retry.',
        success: null,
      }))
      return
    }
    setState((current) => ({
      ...current,
      status: 'ready',
      pendingInvitees: current.pendingInvitees.filter(
        (invitee) => !current.collectableInvitees.includes(invitee),
      ),
      collectableInvitees: [],
      error: null,
      success: current.collectableInvitees.length
        ? 'Invite rewards collected successfully.'
        : 'No rewards were collected.',
    }))
  }, [options.collectShouldFail])

  const actions: InviteActions = useMemo(
    () => ({ refresh, join, collectAll, validateCode }),
    [refresh, join, collectAll, validateCode],
  )

  return useMemo(() => ({ state, actions }), [state, actions])
}

export function MockInviteRuntimeProvider({
  initialState,
  options,
  children,
}: {
  initialState: InviteState
  options?: MockInviteRuntimeOptions
  children: React.ReactNode
}) {
  const runtime = useMockInviteRuntime(initialState, options)
  return (
    <InviteRuntimeContext.Provider value={runtime}>{children}</InviteRuntimeContext.Provider>
  )
}

export function InviteRewardsFixtureStory({
  fixture,
  options,
  dataTestId,
}: {
  fixture: keyof typeof inviteRewardsFixtures
  options?: MockInviteRuntimeOptions
  dataTestId: string
}) {
  return (
    <GoodWidgetProvider defaultTheme="dark">
      <div data-testid={dataTestId} style={{ maxWidth: 480 }}>
        <MockInviteRuntimeProvider initialState={inviteRewardsFixtures[fixture]()} options={options}>
          <InviteRewards />
        </MockInviteRuntimeProvider>
      </div>
    </GoodWidgetProvider>
  )
}
