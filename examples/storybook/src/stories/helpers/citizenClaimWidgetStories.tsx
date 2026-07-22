import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { YStack } from '@goodwidget/ui'
import { CitizenClaimWidget } from '@goodwidget/citizen-claim-widget'
import type { InviteAdapterResult, InviteState } from '@goodwidget/citizen-claim-widget'
import { stringToHex, zeroAddress, type Address } from 'viem'
import {
  getInjectedEip1193Provider,
  isInjectedProviderUsable,
} from '../../fixtures/injectedEip1193'
import { createCustodialEip1193Provider } from '../../fixtures/custodialEip1193'

function CitizenClaimWidgetStoryShell({
  provider,
  dataTestId,
  inviteAdapterFactory,
}: {
  provider: unknown
  dataTestId: string
  inviteAdapterFactory?: () => InviteAdapterResult
}) {
  // const [activeTab, setActiveTab] = useState<CitizenClaimTab>('claim')
  const [activeChainId, setActiveChainId] = useState<number | null>(null)

  useEffect(() => {
    const eip1193Provider = provider as {
      request?: (args: { method: string }) => Promise<unknown>
      on?: (event: string, listener: (value: unknown) => void) => void
      removeListener?: (event: string, listener: (value: unknown) => void) => void
    } | null

    if (!eip1193Provider?.request) return

    const syncChain = async () => {
      const hex = (await eip1193Provider.request?.({ method: 'eth_chainId' })) as string
      if (typeof hex === 'string') setActiveChainId(parseInt(hex, 16))
    }

    const onChainChanged = (hex: unknown) => {
      if (typeof hex === 'string') setActiveChainId(parseInt(hex, 16))
    }

    void syncChain()
    eip1193Provider.on?.('chainChanged', onChainChanged)
    return () => eip1193Provider.removeListener?.('chainChanged', onChainChanged)
  }, [provider])

  return (
    <CitizenClaimWidget
      provider={provider}
      environment="development"
      data-testid={dataTestId}
      chainId={activeChainId ?? 42220}
      inviteAdapterFactory={inviteAdapterFactory}
    />
  )
}

const CURRENT_ADDRESS = '0x1111111111111111111111111111111111111111' as Address
const INVITER_ADDRESS = '0x2222222222222222222222222222222222222222' as Address
const APPROVED_ADDRESS = '0x3333333333333333333333333333333333333333' as Address
const WAITING_ADDRESS = '0x4444444444444444444444444444444444444444' as Address
const COLLECTABLE_ADDRESS = '0x5555555555555555555555555555555555555555' as Address
const PERSONAL_CODE = stringToHex('GOOD-ABB', { size: 32 })

type InviteFixtureKind = 'ready' | 'pending' | 'collectable' | 'success' | 'error'

function createInviteFixtureState(kind: InviteFixtureKind): InviteState {
  const hasWaiting = kind !== 'ready'
  const hasCollectable = kind === 'collectable'
  const pendingInvitees = [
    ...(hasWaiting ? [WAITING_ADDRESS] : []),
    ...(hasCollectable ? [COLLECTABLE_ADDRESS] : []),
  ]

  return {
    status: 'ready',
    address: CURRENT_ADDRESS,
    chainId: 42220,
    user: {
      invitedBy: zeroAddress,
      inviteCode: PERSONAL_CODE,
      bountyPaid: false,
      level: 1n,
      levelStarted: 1n,
      totalApprovedInvites: 2n,
      totalEarned: 15n * 10n ** 18n,
      joinedAt: 1n,
      bountyAtJoin: 5n * 10n ** 18n,
    },
    level: {
      toNext: 5n,
      bounty: 5n * 10n ** 18n,
      daysToComplete: 30n,
    },
    invitees: [APPROVED_ADDRESS, ...pendingInvitees],
    pendingInvitees,
    collectableInvitees: hasCollectable ? [COLLECTABLE_ADDRESS] : [],
    eligibility: Object.fromEntries(
      pendingInvitees.map((invitee) => [
        invitee,
        {
          isActive: true,
          inviteeWhitelisted: true,
          inviterWhitelisted: true,
          minimumClaims: 3,
          minimumDays: 7,
          reverificationDue: false,
        },
      ]),
    ),
    selfEligibility: {
      isActive: true,
      inviteeWhitelisted: true,
      inviterWhitelisted: null,
      minimumClaims: 3,
      minimumDays: 7,
      reverificationDue: false,
    },
    error: kind === 'error' ? 'Invite transaction failed. Please retry.' : null,
    success: kind === 'success' ? 'Joined inviter successfully.' : null,
  }
}

function InviteFixtureStory({ kind }: { kind: InviteFixtureKind }) {
  const [state, setState] = useState<InviteState>(() => createInviteFixtureState(kind))

  const refresh = useCallback(async () => undefined, [])
  const validateCode = useCallback(async (code: string) => {
    if (code.trim() !== 'FRIEND-42') throw new Error('This invite code was not found.')
    return code.trim()
  }, [])
  const join = useCallback(async (inviterCode?: string) => {
    setState((current) => ({ ...current, status: 'joining', error: null, success: null }))
    await Promise.resolve()
    setState((current) => ({
      ...current,
      status: 'ready',
      user: current.user
        ? { ...current.user, invitedBy: inviterCode ? INVITER_ADDRESS : current.user.invitedBy }
        : null,
      success: inviterCode ? 'Joined inviter successfully.' : 'Invite code created successfully.',
    }))
  }, [])
  const collectAll = useCallback(async () => {
    setState((current) => ({ ...current, status: 'collecting', error: null, success: null }))
    await Promise.resolve()
    setState((current) => ({
      ...current,
      status: 'ready',
      pendingInvitees: current.pendingInvitees.filter(
        (invitee) => invitee.toLowerCase() !== COLLECTABLE_ADDRESS.toLowerCase(),
      ),
      collectableInvitees: [],
      user: current.user
        ? {
            ...current.user,
            totalApprovedInvites: current.user.totalApprovedInvites + 1n,
            totalEarned: current.user.totalEarned + 5n * 10n ** 18n,
          }
        : null,
      success: 'Invite rewards collected successfully.',
    }))
  }, [])

  const adapter = useMemo<InviteAdapterResult>(
    () => ({ state, actions: { refresh, validateCode, join, collectAll } }),
    [collectAll, join, refresh, state, validateCode],
  )
  const adapterFactory = useCallback(() => adapter, [adapter])

  return (
    <CitizenClaimWidgetStoryShell
      provider={null}
      dataTestId={`CitizenClaimWidget-invite-${kind}`}
      inviteAdapterFactory={adapterFactory}
    />
  )
}

export function InviteReadyStory() {
  return <InviteFixtureStory kind="ready" />
}

export function InvitePendingStory() {
  return <InviteFixtureStory kind="pending" />
}

export function InviteCollectableStory() {
  return <InviteFixtureStory kind="collectable" />
}

export function InviteSuccessStory() {
  return <InviteFixtureStory kind="success" />
}

export function InviteErrorStory() {
  return <InviteFixtureStory kind="error" />
}

export function InjectedWalletStory() {
  const injectedProvider = getInjectedEip1193Provider()
  const usableProvider = isInjectedProviderUsable(injectedProvider)

  if (!usableProvider) {
    return (
      <YStack data-testid="CitizenClaimWidget-no-wallet" style={{ width: 420 }} gap="$3">
        <strong>No injected wallet found</strong>
        <span>
          Install/enable MetaMask (or another EIP-1193 wallet) in this browser, then refresh
          Storybook.
        </span>
      </YStack>
    )
  }

  return (
    <CitizenClaimWidgetStoryShell
      provider={injectedProvider}
      dataTestId="CitizenClaimWidget-injected-wallet"
    />
  )
}

export function CustodialLocalFixtureStory() {
  try {
    const provider = createCustodialEip1193Provider()
    return (
      <CitizenClaimWidgetStoryShell
        provider={provider}
        dataTestId="CitizenClaimWidget-custodial-wallet"
      />
    )
  } catch (error: unknown) {
    return (
      <YStack data-testid="CitizenClaimWidget-custodial-config-error" style={{ width: 420 }}>
        <strong>Custodial fixture not configured</strong>
        <span>
          {error instanceof Error
            ? error.message
            : 'Set a local private key in custodialEip1193.ts'}
        </span>
      </YStack>
    )
  }
}
