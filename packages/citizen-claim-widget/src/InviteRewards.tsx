import React, { useCallback, useState } from 'react'
import {
  Button,
  ButtonText,
  Card,
  Heading,
  Input,
  Separator,
  Spinner,
  Text,
  YStack,
} from '@goodwidget/ui'
import { zeroHash } from 'viem'
import { decodeInviteCode, formatInviteBounty, useInviteRuntime } from './inviteAdapter'
import { canAttachInviter, hasCollectableInvitees } from './inviteRules'

function InviteJoinCard({ compact = false }: { compact?: boolean }) {
  const { state, actions } = useInviteRuntime()
  const [code, setCode] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const canJoin = canAttachInviter(state.user)
  const isPending = state.status === 'joining'

  const joinWithCode = useCallback(async () => {
    try {
      setValidationError(null)
      await actions.validateCode(code)
      await actions.join(code)
    } catch (error: unknown) {
      setValidationError(error instanceof Error ? error.message : 'Enter a valid invite code.')
    }
  }, [actions, code])

  if (!canJoin || state.status === 'disconnected' || state.status === 'unsupported') return null

  return (
    <Card padding="$4" gap="$3">
      <Heading level={compact ? 4 : 3}>Have an invite code?</Heading>
      <Text secondary>Enter your inviter&apos;s code to join their invite rewards.</Text>
      <Input
        value={code}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setCode(event.target.value)}
        placeholder="Invite code"
        autoCapitalize="none"
      />
      {validationError && <Text color="$error">{validationError}</Text>}
      <Button fullWidth disabled={!code.trim() || isPending} onPress={joinWithCode}>
        <ButtonText>{isPending ? 'Joining…' : 'Join with code'}</ButtonText>
      </Button>
    </Card>
  )
}

function InviteShareCard() {
  const { state, actions } = useInviteRuntime()
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)
  const hasCode = state.user?.inviteCode !== zeroHash

  const share = useCallback(async () => {
    if (!state.user || !hasCode) return
    const inviteCode = state.user.inviteCode
    const message = `Claim GoodDollar with me. Open this page and use my invite code: ${decodeInviteCode(inviteCode)}\n${window.location.href}`

    try {
      if (navigator.share) {
        await navigator.share({ text: message })
      } else {
        await navigator.clipboard.writeText(message)
      }
      setShareFeedback('Invite message ready to send.')
    } catch {
      setShareFeedback('Could not copy the invite message. Please retry.')
    }
  }, [hasCode, state.user])

  if (!state.user) return null

  if (!hasCode) {
    const isVerified = state.selfEligibility?.inviteeWhitelisted
    return (
      <Card padding="$4" gap="$3">
        <Heading level={3}>Create your invite code</Heading>
        <Text secondary>
          {isVerified
            ? 'Create a code to invite friends to claim G$.'
            : 'Verify your identity before creating an invite code.'}
        </Text>
        <Button
          fullWidth
          disabled={!isVerified || state.status === 'joining'}
          onPress={() => actions.join()}
        >
          <ButtonText>{state.status === 'joining' ? 'Creating…' : 'Create invite code'}</ButtonText>
        </Button>
      </Card>
    )
  }

  return (
    <Card padding="$4" gap="$3">
      <Heading level={3}>Share your invite</Heading>
      <Text secondary>Your invite code</Text>
      <Text fontWeight="700">{decodeInviteCode(state.user.inviteCode)}</Text>
      <Button fullWidth onPress={share}>
        <ButtonText>Share or copy invite</ButtonText>
      </Button>
      {shareFeedback && (
        <Text color={shareFeedback.startsWith('Could') ? '$error' : '$success'}>
          {shareFeedback}
        </Text>
      )}
    </Card>
  )
}

function InviteeStatus() {
  const { state, actions } = useInviteRuntime()
  const collectable = hasCollectableInvitees(state.collectableInvitees)
  const isCollecting = state.status === 'collecting'
  const approvedInvites = state.user?.totalApprovedInvites ?? 0n
  const collectableAddresses = new Set(
    state.collectableInvitees.map((invitee) => invitee.toLowerCase()),
  )

  return (
    <Card padding="$4" gap="$3">
      <Heading level={3}>Your invite rewards</Heading>
      <Text secondary>
        {approvedInvites.toString()} approved invite{approvedInvites === 1n ? '' : 's'}
      </Text>
      <Text secondary>
        {state.pendingInvitees.length} pending reward
        {state.pendingInvitees.length === 1 ? '' : 's'}
      </Text>
      <Text secondary>{state.collectableInvitees.length} ready to collect</Text>
      {state.user && (
        <Text fontWeight="700">
          Total earned: {formatInviteBounty(state.user.totalEarned, state.chainId)} G$
        </Text>
      )}
      {state.level && (
        <Text secondary>
          Earn {formatInviteBounty(state.level.bounty, state.chainId)} G$ per eligible invitee.
        </Text>
      )}
      {state.pendingInvitees.map((invitee) => {
        const details = state.eligibility[invitee]
        const status = collectableAddresses.has(invitee.toLowerCase())
          ? 'Ready to collect.'
          : details?.inviteeWhitelisted
            ? `Waiting for ${details.minimumDays} days and ${details.minimumClaims} claims.`
            : 'Waiting for identity verification.'
        return (
          <Text
            key={invitee}
            variant="caption"
            secondary
          >{`${invitee.slice(0, 6)}…${invitee.slice(-4)} — ${status}`}</Text>
        )
      })}
      {state.pendingInvitees.length === 0 && (
        <Text variant="caption" secondary>
          No pending invite rewards.
        </Text>
      )}
      <Button fullWidth disabled={!collectable || isCollecting} onPress={actions.collectAll}>
        <ButtonText>{isCollecting ? 'Collecting…' : 'Collect eligible rewards'}</ButtonText>
      </Button>
    </Card>
  )
}

/** Full Invite Rewards hierarchy, using the shared provider-first InviteSDK runtime. */
export function InviteRewards() {
  const { state, actions } = useInviteRuntime()

  if (state.status === 'loading') {
    return (
      <Card padding="$6">
        <YStack alignItems="center" gap="$3">
          <Spinner size="lg" />
          <Text secondary>Loading invite rewards…</Text>
        </YStack>
      </Card>
    )
  }

  if (state.status === 'disconnected') {
    return (
      <Card padding="$4">
        <Text secondary>Connect your wallet to view invite rewards.</Text>
      </Card>
    )
  }

  if (state.status === 'unsupported') {
    return (
      <Card padding="$4">
        <Text secondary>
          Invite rewards are available on Celo and XDC. Switch networks to continue.
        </Text>
      </Card>
    )
  }

  if (state.status === 'error') {
    return (
      <Card padding="$4" gap="$3">
        <Text color="$error">{state.error}</Text>
        <Button onPress={actions.refresh}>
          <ButtonText>Retry</ButtonText>
        </Button>
      </Card>
    )
  }

  return (
    <YStack gap="$4" padding="$4">
      <Card padding="$4" gap="$2">
        <Heading level={2}>Invite Rewards</Heading>
        <Text secondary>Invite friends to claim GoodDollar and earn G$ rewards together.</Text>
        <Separator />
        <Heading level={4}>How it works</Heading>
        <Text secondary>
          1. Share your code. 2. Your friend joins and claims. 3. After identity, claim-day, and
          minimum-claim requirements are met, collect your reward.
        </Text>
      </Card>
      {(state.success || state.error) && (
        <Card padding="$3">
          <Text color={state.error ? '$error' : '$success'}>{state.error ?? state.success}</Text>
        </Card>
      )}
      <InviteShareCard />
      <InviteJoinCard />
      <InviteeStatus />
    </YStack>
  )
}

/** Claim-tab entry point backed by the same invite runtime as Invite Rewards. */
export function ClaimInviteJoinCard() {
  return <InviteJoinCard compact />
}
