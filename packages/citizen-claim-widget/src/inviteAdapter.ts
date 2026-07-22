import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import bs58 from 'bs58'
import {
  formatBounty,
  InviteSDK,
  InviteSDKError,
  isSupportedChain,
  type BountyResult,
  type BountyEligibilityDetails,
  type InviteLevel,
  type InviteUser,
} from '@goodsdks/invite-sdk'
import { hexToBytes, hexToString, stringToHex, zeroAddress, zeroHash, type Address } from 'viem'
import { useWallet } from '@goodwidget/core'
import { createCitizenWidgetClients } from './adapter'
import { getMyInviteCode, hasCollectableInvitees } from './inviteRules'
import type { CitizenClaimWidgetEnvironment } from './widgetRuntimeContract'

export type InviteStatus =
  | 'disconnected'
  | 'unsupported'
  | 'loading'
  | 'ready'
  | 'joining'
  | 'collecting'
  | 'error'

export interface InviteState {
  status: InviteStatus
  address: Address | null
  chainId: number | null
  user: InviteUser | null
  level: InviteLevel | null
  invitees: Address[]
  pendingInvitees: Address[]
  collectableInvitees: Address[]
  eligibility: Record<string, BountyEligibilityDetails>
  selfEligibility: BountyEligibilityDetails | null
  error: string | null
  success: string | null
}

export interface InviteActions {
  refresh: () => Promise<void>
  join: (inviterCode?: string) => Promise<void>
  collectAll: () => Promise<void>
  validateCode: (code: string) => Promise<string>
}

export interface InviteAdapterResult {
  state: InviteState
  actions: InviteActions
}

/** Deterministic adapter seam used by Storybook and component tests. */
export type InviteAdapterFactory = () => InviteAdapterResult

interface InviteJoinSdk {
  resolveCode: (code: `0x${string}`) => Promise<Address>
  join: (myCode: `0x${string}`, inviterCode: `0x${string}`) => Promise<`0x${string}`>
}

interface InviteCollectionSdk {
  collectAllBounties: () => Promise<BountyResult[]>
}

const InviteRuntimeContext = createContext<InviteAdapterResult | null>(null)

const initialInviteState: InviteState = {
  status: 'disconnected',
  address: null,
  chainId: null,
  user: null,
  level: null,
  invitees: [],
  pendingInvitees: [],
  collectableInvitees: [],
  eligibility: {},
  selfEligibility: null,
  error: null,
  success: null,
}

/** Converts the human-readable Base58 code to the bytes32 value expected by InviteSDK. */
export function encodeInviteCode(code: string): `0x${string}` {
  const normalizedCode = code.trim()
  if (!normalizedCode || normalizedCode.length > 32) {
    throw new Error('Enter a valid invite code.')
  }

  return stringToHex(normalizedCode, { size: 32 })
}

/** Decodes the Base58 string stored in the contract's right-padded bytes32 field. */
export function decodeInviteCode(code: `0x${string}`): string {
  if (code === zeroHash) return ''
  return hexToString(code, { size: 32 }).replace(/\0+$/, '')
}

/**
 * Mirrors GoodWallet's deterministic short-code algorithm while delegating each
 * protocol lookup to InviteSDK.resolveCode.
 */
export async function generateInviteCode(
  address: Address,
  resolveCode: (code: `0x${string}`) => Promise<Address>,
): Promise<string> {
  const encodedAddress = bs58.encode(hexToBytes(address))

  for (let length = 10; length <= 30; length += 1) {
    const candidate = encodedAddress.slice(0, length)
    const owner = await resolveCode(encodeInviteCode(candidate))

    if (owner.toLowerCase() === address.toLowerCase()) {
      throw new Error('You already have an invite code. Refresh to view it.')
    }
    if (owner === zeroAddress) return candidate
  }

  throw new Error('We could not generate an invite code. Please retry.')
}

export async function validateInviteCode(
  sdk: Pick<InviteJoinSdk, 'resolveCode'>,
  address: Address,
  code: string,
): Promise<string> {
  const normalizedCode = code.trim()
  const owner = await sdk.resolveCode(encodeInviteCode(normalizedCode))
  if (owner === zeroAddress) throw new Error('This invite code was not found.')
  if (owner.toLowerCase() === address.toLowerCase()) {
    throw new Error('You cannot use your own invite code.')
  }
  return normalizedCode
}

/** Shared write path used by the live adapter and deterministic adapter tests. */
export async function submitInviteJoin({
  sdk,
  address,
  user,
  inviterCode,
}: {
  sdk: InviteJoinSdk
  address: Address
  user: InviteUser | null
  inviterCode?: string
}): Promise<boolean> {
  const validatedInviterCode = inviterCode
    ? await validateInviteCode(sdk, address, inviterCode)
    : undefined
  const ownCode = await getMyInviteCode(user, async () =>
    encodeInviteCode(await generateInviteCode(address, sdk.resolveCode.bind(sdk))),
  )
  await sdk.join(ownCode, validatedInviterCode ? encodeInviteCode(validatedInviterCode) : zeroHash)
  return Boolean(validatedInviterCode)
}

/** Prevents batch collection unless InviteSDK reported an eligible pending invitee. */
export async function collectEligibleInviteRewards(
  sdk: InviteCollectionSdk,
  collectableInvitees: Address[],
): Promise<BountyResult[]> {
  if (!hasCollectableInvitees(collectableInvitees)) return []
  return sdk.collectAllBounties()
}

function inviteErrorMessage(error: unknown): string {
  if (error instanceof InviteSDKError) {
    switch (error.errorCode) {
      case 'NOT_ACTIVE':
        return 'Invite rewards are not active right now.'
      case 'INVITE_CODE_IN_USE':
        return 'That invite code was just used. Please retry.'
      case 'SELF_INVITE':
        return 'You cannot use your own invite code.'
      case 'USER_ALREADY_JOINED':
      case 'INVITER_ALREADY_ATTACHED':
        return 'You have already joined an inviter.'
      case 'BOUNTY_ALREADY_PAID':
        return 'Your invite bounty has already been paid.'
      case 'NOT_ELIGIBLE_BOUNTY':
        return 'This reward is not ready to collect yet.'
      default:
        return 'Invite transaction failed. Please retry.'
    }
  }

  if (error instanceof Error) return error.message
  return 'Invite request failed. Please retry.'
}

/**
 * Manages shared InviteSDK reads and writes for both citizen-claim entry points.
 * All contract preconditions, simulation, and writes remain in InviteSDK.
 */
export function useInviteAdapter(environment: CitizenClaimWidgetEnvironment): InviteAdapterResult {
  const { address, chainId, isConnected, provider } = useWallet()
  const [state, setState] = useState<InviteState>(initialInviteState)

  const getSdk = useCallback(async () => {
    if (!address || !provider || !chainId || !isSupportedChain(chainId)) return null
    const clients = createCitizenWidgetClients(provider, address, chainId)
    if (!clients) return null
    return InviteSDK.init({ ...clients, env: environment })
  }, [address, chainId, environment, provider])

  const refresh = useCallback(async () => {
    if (!isConnected || !address) {
      setState(initialInviteState)
      return
    }
    if (!chainId || !isSupportedChain(chainId)) {
      setState({
        ...initialInviteState,
        status: 'unsupported',
        address: address as Address,
        chainId,
      })
      return
    }

    setState((current) => ({
      ...current,
      status: 'loading',
      address: address as Address,
      chainId,
      error: null,
      success: null,
    }))

    try {
      const sdk = await getSdk()
      if (!sdk) throw new Error('Unable to initialize invite rewards.')
      const user = await sdk.getUser(address as Address)
      const [level, invitees, pendingInvitees, collectableInvitees, selfEligibility] =
        await Promise.all([
          sdk.getLevel(Number(user.level)),
          sdk.getInvitees(address as Address),
          sdk.getPendingInvitees(address as Address),
          sdk.getCollectableInvitees(address as Address),
          sdk.checkEligibilityDetails(address as Address),
        ])
      const eligibilityEntries = await Promise.all(
        pendingInvitees.map(async (invitee) => {
          const { details } = await sdk.checkEligibilityDetails(invitee)
          return [invitee, details] as const
        }),
      )

      setState({
        status: 'ready',
        address: address as Address,
        chainId,
        user,
        level,
        invitees,
        pendingInvitees,
        collectableInvitees,
        eligibility: Object.fromEntries(eligibilityEntries),
        selfEligibility: selfEligibility.details,
        error: null,
        success: null,
      })
    } catch (error: unknown) {
      setState((current) => ({
        ...current,
        status: 'error',
        address: address as Address,
        chainId,
        error: inviteErrorMessage(error),
        success: null,
      }))
    }
  }, [address, chainId, getSdk, isConnected])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const validateCode = useCallback(
    async (code: string): Promise<string> => {
      const sdk = await getSdk()
      if (!sdk || !address || !state.user)
        throw new Error('Connect on Celo or XDC to use invite rewards.')
      return validateInviteCode(sdk, address as Address, code)
    },
    [address, getSdk, state.user],
  )

  const join = useCallback(
    async (inviterCode?: string) => {
      const sdk = await getSdk()
      if (!sdk || !address) {
        setState((current) => ({
          ...current,
          error: 'Connect on Celo or XDC to join.',
          success: null,
        }))
        return
      }

      setState((current) => ({ ...current, status: 'joining', error: null, success: null }))
      try {
        const attachedInviter = await submitInviteJoin({
          sdk,
          address: address as Address,
          user: state.user,
          inviterCode,
        })
        await refresh()
        setState((current) => ({
          ...current,
          success: attachedInviter
            ? 'Joined inviter successfully.'
            : 'Invite code created successfully.',
        }))
      } catch (error: unknown) {
        setState((current) => ({
          ...current,
          status: 'ready',
          error: inviteErrorMessage(error),
          success: null,
        }))
      }
    },
    [address, getSdk, refresh, state.user],
  )

  const collectAll = useCallback(async () => {
    const sdk = await getSdk()
    if (!sdk || !hasCollectableInvitees(state.collectableInvitees)) return

    setState((current) => ({ ...current, status: 'collecting', error: null, success: null }))
    try {
      const results = await collectEligibleInviteRewards(sdk, state.collectableInvitees)
      await refresh()
      setState((current) => ({
        ...current,
        success: results.length
          ? 'Invite rewards collected successfully.'
          : 'No rewards were collected.',
      }))
    } catch (error: unknown) {
      setState((current) => ({
        ...current,
        status: 'ready',
        error: inviteErrorMessage(error),
        success: null,
      }))
    }
  }, [getSdk, refresh, state.collectableInvitees])

  return useMemo(
    () => ({ state, actions: { refresh, join, collectAll, validateCode } }),
    [collectAll, join, refresh, state, validateCode],
  )
}

/** Shares one invite state machine between the Claim and Invite Rewards tabs. */
export function InviteRuntimeProvider({
  children,
  environment,
  adapterFactory,
}: {
  children: ReactNode
  environment: CitizenClaimWidgetEnvironment
  adapterFactory?: InviteAdapterFactory
}) {
  if (adapterFactory) {
    return createElement(InviteRuntimeContext.Provider, { value: adapterFactory() }, children)
  }

  return createElement(LiveInviteRuntimeProvider, { environment, children })
}

function LiveInviteRuntimeProvider({
  children,
  environment,
}: {
  children: ReactNode
  environment: CitizenClaimWidgetEnvironment
}) {
  const inviteRuntime = useInviteAdapter(environment)
  return createElement(InviteRuntimeContext.Provider, { value: inviteRuntime }, children)
}

export function useInviteRuntime(): InviteAdapterResult {
  const inviteRuntime = useContext(InviteRuntimeContext)
  if (!inviteRuntime) throw new Error('InviteRuntimeProvider is required.')
  return inviteRuntime
}

export function formatInviteBounty(amount: bigint, chainId: number | null): string {
  return chainId && isSupportedChain(chainId) ? formatBounty(amount, chainId) : '0.00'
}
