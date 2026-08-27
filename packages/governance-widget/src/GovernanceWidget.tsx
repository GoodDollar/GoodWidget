import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet, WalletControls } from '@goodwidget/core'
import {
  Button,
  ButtonText,
  Card,
  Heading,
  Icon,
  resolveThemeColor,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@goodwidget/ui'
import { useTheme } from 'tamagui'
import { AlignmentVotingProposalCard } from './AlignmentVotingProposalCard'
import { BalanceCard } from './BalanceCard'
import { FundingDistributionChart } from './FundingDistributionChart'
import { GovernanceOnboardingWidget } from './GovernanceOnboardingWidget'
import { GovernanceWidgetProvider } from './GovernanceWidgetProvider'
import { ImpactCard } from './ImpactCard'
import { useGovernanceAdapter } from './adapter'
import {
  getGovernanceVotingDisabledReason,
  type GovernanceWidgetAdapterActions,
  type GovernanceWidgetAdapterFactoryInput,
  type GovernanceWidgetAdapterResult,
  type GovernanceWidgetAdapterState,
  type GovernanceWidgetProps,
} from './widgetRuntimeContract'
import { isActiveStatus } from './adapter'
import { formatStakeAmount } from './sdks/contracts'

const GOVERNANCE_WIDGET_MAX_WIDTH = 480

function formatMemberDate(timestamp: number | null): string {
  if (!timestamp) return 'Not available'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(timestamp),
  )
}

function formatMemberDateTime(timestamp: number | null): string {
  if (!timestamp) return 'Not available'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function GovernanceHeader({
  state,
  actions,
}: {
  state: GovernanceWidgetAdapterState
  actions: GovernanceWidgetAdapterActions
}) {
  const { address: walletContextAddress } = useWallet()

  return (
    <YStack
      backgroundColor="$background"
      borderBottomWidth={1}
      borderColor="$borderColor"
      padding="$4"
      data-testid="GovernanceWidget-header"
    >
      <XStack alignItems="center" justifyContent="space-between" gap="$3" flexWrap="wrap">
        <XStack alignItems="center" gap="$3" flex={1} minWidth={180}>
          <YStack
            width={40}
            height={40}
            borderRadius="$full"
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
          >
            <Icon name="shield-check" size="sm" color="white" />
          </YStack>
          <Heading level={5} color="$primary">GoodDAO</Heading>
        </XStack>
        {state.address && walletContextAddress ? (
          <WalletControls />
        ) : state.address ? (
          <YStack alignItems="flex-end" gap="$1">
            <Text variant="caption" tone="secondary">Connected wallet</Text>
            <Text fontWeight="700">{`${state.address.slice(0, 6)}…${state.address.slice(-4)}`}</Text>
          </YStack>
        ) : (
          <Button
            size="sm"
            borderRadius="$3"
            height="$7"
            paddingHorizontal="$3"
            flexShrink={0}
            onPress={() => {
              void actions.connect()
            }}
          >
            <ButtonText>Connect Wallet</ButtonText>
          </Button>
        )}
      </XStack>
    </YStack>
  )
}

function RuntimeNotice({
  state,
  actions,
}: {
  state: GovernanceWidgetAdapterState
  actions: GovernanceWidgetAdapterActions
}) {
  if (state.status === 'loading') {
    return (
      <Card data-testid="GovernanceWidget-loading">
        <YStack gap="$3" alignItems="center">
          <Spinner size="lg" />
          <Text center>Loading wallet, identity, membership, and governance data…</Text>
        </YStack>
      </Card>
    )
  }

  if (state.status === 'unsupported_chain') {
    return (
      <Card data-testid="GovernanceWidget-unsupported-chain">
        <YStack gap="$3">
          <Text color="$warning" fontWeight="700">
            Switch to Celo Mainnet
          </Text>
          <Text tone="secondary">
            GoodDAO Houses are deployed on Celo Mainnet. Switch networks to continue with membership actions.
          </Text>
          <Button
            onPress={() => {
              void actions.switchToCelo()
            }}
          >
            <ButtonText>Switch to Celo</ButtonText>
          </Button>
        </YStack>
      </Card>
    )
  }

  if (state.status === 'friendly_error') {
    return (
      <Card data-testid="GovernanceWidget-friendly-error">
        <YStack gap="$3">
          <Text color="$error" fontWeight="700">
            Governance data unavailable
          </Text>
          <Text tone="secondary">{state.error ?? 'Please try again.'}</Text>
          <Button
            variant="secondary"
            onPress={() => {
              void actions.retry()
            }}
          >
            <ButtonText>Retry</ButtonText>
          </Button>
        </YStack>
      </Card>
    )
  }

  return null
}

function GovernanceDashboard({
  state,
  actions,
}: {
  state: GovernanceWidgetAdapterState
  actions: GovernanceWidgetAdapterActions
}) {
  const carouselRef = useRef<HTMLDivElement>(null)
  const [activeVotingIndex, setActiveVotingIndex] = useState(0)
  const votingSections = [
    state.dashboard.alignmentVoting,
    ...(state.dashboard.alignmentVotingHistory ?? []),
  ]

  const goToVotingSection = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, votingSections.length - 1))
    setActiveVotingIndex(nextIndex)
    carouselRef.current?.scrollTo({
      left: nextIndex * carouselRef.current.clientWidth,
      behavior: 'smooth',
    })
  }

  return (
    <YStack gap="$4" width="100%" data-testid="GovernanceWidget-dashboard">
      <ImpactCard {...state.dashboard.impact} testID="GovernanceWidget-impact" />
      <BalanceCard {...state.dashboard.activeMembers} testID="GovernanceWidget-active-members" />
      <YStack
        width="100%"
        gap="$3"
        data-testid="GovernanceWidget-voting-carousel"
        ref={carouselRef}
        style={{ overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
      >
        <XStack width="100%" gap="$3" paddingRight="$3">
          {votingSections.map((voting, index) => (
            <YStack
              key={voting.voteId}
              width="calc(100% - 24px)"
              minWidth="calc(100% - 24px)"
              flexShrink={0}
              style={{ scrollSnapAlign: 'start' }}
            >
              <AlignmentVotingProposalCard
                id={voting.voteId}
                categoryLabel={index === 0 ? 'Alignment Voting' : 'Previous Alignment Vote'}
                title={voting.title}
                summaryLabel={voting.summaryLabel}
                options={voting.options}
                testID={index === 0 ? 'GovernanceWidget-active-governance' : `GovernanceWidget-past-governance-${index}`}
                onPress={index === 0 ? () => actions.openVote() : undefined}
              />
            </YStack>
          ))}
        </XStack>
      </YStack>
      {votingSections.length > 1 ? (
        <XStack alignItems="center" justifyContent="space-between" gap="$3">
          <Text variant="caption" tone="secondary">
            Voting round {activeVotingIndex + 1} of {votingSections.length}
          </Text>
          <XStack gap="$2">
            <Button
              size="sm"
              variant="secondary"
              disabled={activeVotingIndex === 0}
              aria-label="Previous voting round"
              onPress={() => goToVotingSection(activeVotingIndex - 1)}
            >
              <Icon name="arrow-left" size="xs" color="primary" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={activeVotingIndex === votingSections.length - 1}
              aria-label="Next voting round"
              onPress={() => goToVotingSection(activeVotingIndex + 1)}
            >
              <Icon name="arrow-right" size="xs" color="primary" />
            </Button>
          </XStack>
        </XStack>
      ) : null}
      {state.dashboard.alignmentVoting.options.length === 0 ? (
        <Card data-testid="GovernanceWidget-empty-recipients">
          <Text tone="secondary">
            {state.dashboard.alignmentVoting.disabledReason ??
              'No House of Alignment members have been assigned yet. Voting will open shortly.'}
          </Text>
        </Card>
      ) : null}
      {state.dashboard.alignmentVoting.hasVoted ? (
        <Card data-testid="GovernanceWidget-already-voted">
          <Text tone="secondary">
            You already voted in this cycle. Ballot updates are not available for this contract version.
          </Text>
        </Card>
      ) : null}
      <FundingDistributionChart
        {...state.dashboard.fundingDistribution}
        testID="GovernanceWidget-funding-distribution"
      />
    </YStack>
  )
}

function PendingAlignmentState({ state }: { state: GovernanceWidgetAdapterState }) {
  return (
    <Card data-testid="GovernanceWidget-pending-alignment">
      <YStack gap="$3">
        <Heading level={4}>Alignment membership pending</Heading>
        <Text tone="secondary">
          Your House of Alignment application is recorded on-chain and is waiting for
          committee approval. No further transaction is required while it is pending.
        </Text>
        <Text variant="caption" tone="secondary">
          Wallet: {state.address ?? 'Not connected'}
        </Text>
      </YStack>
    </Card>
  )
}

function MembershipExitState({
  state,
  actions,
}: {
  state: GovernanceWidgetAdapterState
  actions: GovernanceWidgetAdapterActions
}) {
  const transaction = state.transaction.kind === 'unstake' ? state.transaction : null
  const isPending =
    transaction?.status === 'wallet_confirmation' ||
    transaction?.status === 'submitted' ||
    transaction?.status === 'confirmed'
  const canSubmit = state.unstakeAvailability.canUnstake && !isPending

  return (
    <Card outlined data-testid="GovernanceWidget-unstake">
      <YStack gap="$3">
        <Heading level={4}>Membership stake</Heading>
        <Text tone="secondary">
          Active governance stakes remain locked for one full term. Once the lock expires,
          unstaking returns your G$ and removes your active membership.
        </Text>
        <XStack gap="$2" justifyContent="space-between" flexWrap="wrap">
          <Text variant="caption" tone="secondary">Available from</Text>
          <Text variant="caption" fontWeight="700">
            {formatMemberDateTime(state.unstakeAvailability.unlockAt)}
          </Text>
        </XStack>
        {!state.unstakeAvailability.canUnstake ? (
          <Text variant="caption" tone="secondary" data-testid="GovernanceWidget-unstake-locked">
            {state.unstakeAvailability.disabledReason}
          </Text>
        ) : null}
        {transaction?.status === 'wallet_confirmation' ? (
          <Text color="$warning" fontWeight="700">Confirm the unstake transaction in your wallet.</Text>
        ) : null}
        {transaction?.status === 'submitted' ? (
          <Text color="$warning" fontWeight="700">
            Transaction submitted. Waiting for a successful Celo receipt…
          </Text>
        ) : null}
        {transaction?.status === 'rejected' ||
        transaction?.status === 'reverted' ||
        transaction?.status === 'failed' ? (
          <Text color="$error" fontWeight="700">
            {transaction.error ?? 'The unstake transaction did not complete.'}
          </Text>
        ) : null}
        <Button
          disabled={!canSubmit}
          onPress={() => {
            void actions.unstake()
          }}
        >
          <ButtonText>{isPending ? 'Unstaking…' : 'Unstake membership'}</ButtonText>
        </Button>
      </YStack>
    </Card>
  )
}

function RevokedState({ state }: { state: GovernanceWidgetAdapterState }) {
  return (
    <Card data-testid="GovernanceWidget-revoked">
      <YStack gap="$3">
        <Heading level={4}>Membership revoked</Heading>
        <Text tone="secondary">
          This governance membership was revoked and cannot be reactivated from the widget.
          Contact the GoodDAO governance team if you believe this status is incorrect.
        </Text>
        <Text variant="caption" tone="secondary">
          Wallet: {state.address ?? 'Not connected'}
        </Text>
      </YStack>
    </Card>
  )
}

function GovernanceSignupBanner({ onResume }: { onResume: () => void }) {
  return (
    <Card outlined data-testid="GovernanceWidget-signup-banner">
      <XStack alignItems="center" justifyContent="space-between" gap="$3" flexWrap="wrap">
        <Text tone="secondary">Sign up and stake to participate in GoodDAO</Text>
        <Button
          variant="secondary"
          backgroundColor="$backgroundHover"
          hoverStyle={{ backgroundColor: '$backgroundPress' }}
          pressStyle={{ backgroundColor: '$backgroundPress' }}
          focusStyle={{ backgroundColor: '$backgroundFocus' }}
          onPress={onResume}
        >
          <ButtonText color="$color">Sign Up</ButtonText>
        </Button>
      </XStack>
    </Card>
  )
}

interface WidgetBounds {
  left: number
  width: number
}

function MemberFooter({
  state,
  bounds,
}: {
  state: GovernanceWidgetAdapterState
  bounds?: WidgetBounds
}) {
  const memberStatus = state.member?.status ?? (
    state.status === 'disconnected' ? 'not connected' :
      state.status === 'onboarding_required' ? 'onboarding' :
        state.status === 'pending_alignment' ? 'pending approval' :
          state.status === 'revoked' ? 'revoked' : 'not available'
  )
  const house = state.member
    ? state.member.house === 'alignment' ? 'House of Alignment' : 'House of Citizenship'
    : 'No house selected'

  return (
    <Card
      outlined
      data-testid="GovernanceWidget-member-footer"
      position="fixed"
      bottom={0}
      width={bounds?.width ?? '100%'}
      maxWidth={bounds ? undefined : GOVERNANCE_WIDGET_MAX_WIDTH}
      left={bounds?.left ?? '50%'}
      zIndex={10}
      backgroundColor="$background"
      borderTopWidth={1}
      paddingHorizontal="$4"
      // Keep the footer fixed for the widget's content width, rather than
      // stretching it across the host page or Storybook viewport.
      style={{
        pointerEvents: 'none',
        transform: bounds ? undefined : 'translateX(-50%)',
        boxSizing: 'border-box',
      } as any}
    >
      <XStack alignItems="center" justifyContent="space-between" gap="$3" flexWrap="wrap">
        <Text variant="caption" tone="secondary">
          House: {house}
        </Text>
        <Text variant="caption" tone="secondary">
          Joined: {state.member ? formatMemberDate(state.member.joinedAt) : 'Not yet'}
        </Text>
        <Text variant="caption" tone="secondary">
          Status: {memberStatus}
        </Text>
      </XStack>
    </Card>
  )
}

function GovernanceVoteDetail({
  state,
  actions,
}: {
  state: GovernanceWidgetAdapterState
  actions: GovernanceWidgetAdapterActions
}) {
  const theme = useTheme()
  const sliderAccentColor = resolveThemeColor(theme, '$primary')
  const sliderTrackColor = resolveThemeColor(theme, '$backgroundHover')
  const vote = state.dashboard.alignmentVoting
  const disabledReason = getGovernanceVotingDisabledReason(vote)
  const voteTransactionPending =
    state.transaction.kind === 'vote' &&
    (
      state.transaction.status === 'wallet_confirmation' ||
      state.transaction.status === 'submitted' ||
      state.transaction.status === 'confirmed'
    )
  const canSubmit =
    vote.canVote &&
    vote.allocationTotalBps === 10000 &&
    !vote.hasVoted &&
    vote.isVotingOpen &&
    !voteTransactionPending
  const isReadOnly = vote.hasVoted || vote.executed || voteTransactionPending

  return (
    <Card data-testid="GovernanceWidget-vote-detail">
      <YStack gap="$4">
        <XStack alignItems="center" justifyContent="space-between" gap="$3">
          <Heading level={4}>{vote.title}</Heading>
          <Button
            variant="secondary"
            backgroundColor="$backgroundHover"
            hoverStyle={{ backgroundColor: '$backgroundPress' }}
            pressStyle={{ backgroundColor: '$backgroundPress' }}
            focusStyle={{ backgroundColor: '$backgroundFocus' }}
            onPress={actions.closeVote}
          >
            <ButtonText color="$color">Back</ButtonText>
          </Button>
        </XStack>
        <Text tone="secondary">
          Allocate basis points across the recipients captured when this vote opened.
          Your allocation must total exactly 10,000 basis points.
        </Text>
        <YStack gap="$3">
          {vote.options.map((option) => {
            const currentValue = vote.allocationsBps[option.id] ?? 0
            const availablePoints = Math.max(0, 10_000 - vote.allocationTotalBps)
            const sliderMax = Math.max(currentValue, currentValue + availablePoints)

            return isReadOnly ? (
              <Text key={option.id} tone="secondary">
                {option.label}: {vote.executed ? `${vote.finalizedUnits[option.id] ?? '0'} finalized units` : `${currentValue} bps`}
              </Text>
            ) : (
              <YStack key={option.id} gap="$2">
                <XStack alignItems="center" justifyContent="space-between" gap="$3">
                  <Text variant="label" color="$primary" flex={1}>{option.label}</Text>
                  <Text variant="label" color="$primary" fontWeight="700">{currentValue} bps</Text>
                </XStack>
                {createElement('input', {
                  type: 'range',
                  min: 0,
                  max: sliderMax,
                  step: 100,
                  value: currentValue,
                  'aria-label': `${option.label} allocation`,
                  onChange: (event: { currentTarget?: { value?: string } }) => {
                    actions.setVoteAllocation(option.id, Number.parseInt(event.currentTarget?.value ?? '0', 10))
                  },
                  style: {
                    width: '100%',
                    accentColor: sliderAccentColor,
                    backgroundColor: sliderTrackColor,
                    color: sliderAccentColor,
                    cursor: 'pointer',
                  },
                })}
                <XStack justifyContent="space-between">
                  <Text variant="caption" tone="secondary">0 bps</Text>
                  <Text variant="caption" tone="secondary">Up to {sliderMax} bps</Text>
                </XStack>
              </YStack>
            )
          })}
        </YStack>
        <Text tone={vote.allocationTotalBps === 10000 ? 'default' : 'secondary'}>
          Allocation total: {vote.allocationTotalBps} / 10,000 bps
        </Text>
        {!isReadOnly ? (
          <Text tone="secondary" data-testid="GovernanceWidget-vote-available-points">
            Available points: {Math.max(0, 10_000 - vote.allocationTotalBps)} bps
          </Text>
        ) : null}
        {vote.hasVoted ? (
          <Text color="$success" fontWeight="700">
            Already voted — this contract does not support ballot replacement.
          </Text>
        ) : null}
        {!canSubmit && !voteTransactionPending ? (
          <Text tone="secondary">{disabledReason ?? 'Voting is unavailable.'}</Text>
        ) : null}
        {state.transaction.kind === 'vote' && state.transaction.status === 'wallet_confirmation' ? (
          <Text color="$warning" fontWeight="700">Confirm the vote in your wallet.</Text>
        ) : null}
        {state.transaction.kind === 'vote' && state.transaction.status === 'submitted' ? (
          <Text color="$warning" fontWeight="700">Vote submitted. Waiting for confirmation…</Text>
        ) : null}
        {state.transaction.kind === 'vote' && state.transaction.status === 'confirmed' ? (
          <Text color="$success" fontWeight="700">Vote confirmed on Celo.</Text>
        ) : null}
        {state.transaction.kind === 'vote' && state.transaction.error ? (
          <Text color="$error" fontWeight="700">{state.transaction.error}</Text>
        ) : null}
        <Button
          disabled={!canSubmit}
          onPress={() => {
            void actions.submitVote()
          }}
        >
          <ButtonText>Submit Allocation Vote</ButtonText>
        </Button>
      </YStack>
    </Card>
  )
}

function GovernanceWidgetView({
  adapter,
  testId,
}: {
  adapter: GovernanceWidgetAdapterResult
  testId?: string
}) {
  const { state, actions } = adapter
  const widgetRef = useRef<HTMLDivElement>(null)
  const [widgetBounds, setWidgetBounds] = useState<WidgetBounds>()
  useEffect(() => {
    const element = widgetRef.current
    if (!element || typeof ResizeObserver === 'undefined') return

    const updateBounds = () => {
      const { left, width } = element.getBoundingClientRect()
      setWidgetBounds({ left, width })
    }

    updateBounds()
    const observer = new ResizeObserver(updateBounds)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Skip is a view-only choice, not membership state: it never touches the
  // contract, so a reload or a wallet reconnect (address change) drops back
  // to onboarding rather than silently remembering the skip.
  const [isOnboardingSkipped, setIsOnboardingSkipped] = useState(false)
  useEffect(() => {
    setIsOnboardingSkipped(false)
  }, [state.address])

  const shouldShowDashboard =
    state.status === 'disconnected' ||
    state.status === 'loading' ||
    state.status === 'unsupported_chain' ||
    state.status === 'friendly_error' ||
    isActiveStatus(state.status) ||
    (state.status === 'onboarding_required' && isOnboardingSkipped)

  return (
    <YStack
      ref={widgetRef}
      gap="$4"
      width="100%"
      paddingBottom="$16"
      data-testid={testId ?? 'GovernanceWidget'}
    >
      <GovernanceHeader state={state} actions={actions} />
      <RuntimeNotice state={state} actions={actions} />
      {state.error && state.status !== 'friendly_error' && state.transaction.status === 'idle' ? (
        <Card data-testid="GovernanceWidget-action-error">
          <YStack gap="$2">
            <Text color="$error" fontWeight="700">Governance action unavailable</Text>
            <Text tone="secondary">{state.error}</Text>
          </YStack>
        </Card>
      ) : null}
      {state.status === 'vote_detail' ? <GovernanceVoteDetail state={state} actions={actions} /> : null}
      {state.status === 'onboarding_required' && isOnboardingSkipped ? (
        <GovernanceSignupBanner onResume={() => setIsOnboardingSkipped(false)} />
      ) : null}
      {state.status === 'onboarding_required' && !isOnboardingSkipped ? (
        <YStack gap="$4">
          {state.lifecycleNotice ? (
            <Card data-testid="GovernanceWidget-lifecycle-notice">
              <Text color="$success" fontWeight="700">{state.lifecycleNotice}</Text>
            </Card>
          ) : null}
          <GovernanceOnboardingWidget
            currentStepId={state.onboardingStepId}
            identityStatus={state.identityStatus}
            walletAddress={state.address ?? undefined}
            initialHouse={state.selectedHouse}
            initialProfileDraft={state.profileDraft}
            stakeAmountLabel={state.stakeAmountLabel}
            stakeAmountLabels={{
              citizenship: formatStakeAmount(state.minimumStakeAmounts.citizenship),
              alignment: formatStakeAmount(state.minimumStakeAmounts.alignment),
            }}
            transactionSteps={state.transactionSteps}
            dataTestId="GovernanceWidget-onboarding"
            onHouseChange={actions.selectHouse}
            onIdentityVerificationPress={() => {
              void actions.startIdentityVerification()
            }}
            onProfileSubmit={(profileDraft) => {
              void actions.register(profileDraft)
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            alignSelf="center"
            height={32}
            paddingHorizontal="$3"
            borderWidth={1}
            borderColor="$primary"
            borderRadius="$2"
            backgroundColor="$primary"
            color="$white"
            hoverStyle={{ backgroundColor: '$primaryDark', borderColor: '$primaryDark', color: '$white' }}
            pressStyle={{ backgroundColor: '$primaryDark', borderColor: '$primaryDark', color: '$white' }}
            focusStyle={{ backgroundColor: '$primaryDark', borderColor: '$primaryDark', color: '$white' }}
            data-testid="GovernanceWidget-skip-onboarding"
            style={{ scrollMarginBottom: 80 }}
            onPress={() => setIsOnboardingSkipped(true)}
          >
            <ButtonText color="$white">Skip for now</ButtonText>
          </Button>
        </YStack>
      ) : null}
      {state.status === 'pending_alignment' ? <PendingAlignmentState state={state} /> : null}
      {state.status === 'revoked' ? <RevokedState state={state} /> : null}
      {shouldShowDashboard ? <GovernanceDashboard state={state} actions={actions} /> : null}
      {isActiveStatus(state.status) ? <MembershipExitState state={state} actions={actions} /> : null}
      <MemberFooter state={state} />
    </YStack>
  )
}

function DefaultGovernanceWidgetContent({
  adapterInput,
  testId,
}: {
  adapterInput: GovernanceWidgetAdapterFactoryInput
  testId?: string
}) {
  const adapter = useGovernanceAdapter(adapterInput)
  return <GovernanceWidgetView adapter={adapter} testId={testId} />
}

function InjectedGovernanceWidgetContent({
  adapterFactory,
  adapterInput,
  testId,
}: {
  adapterFactory: NonNullable<GovernanceWidgetProps['adapterFactory']>
  adapterInput: GovernanceWidgetAdapterFactoryInput
  testId?: string
}) {
  const adapter = adapterFactory(adapterInput)
  return <GovernanceWidgetView adapter={adapter} testId={testId} />
}

export function GovernanceWidget({
  provider,
  themeOverrides,
  config,
  defaultTheme = 'light',
  adapterFactory,
  testId,
  environment,
  celoRpcUrl,
  addresses,
}: GovernanceWidgetProps) {
  const adapterInput = useMemo(
    () => ({ environment, celoRpcUrl, addresses }),
    [addresses, celoRpcUrl, environment],
  )

  return (
    <GovernanceWidgetProvider
      provider={provider}
      themeOverrides={themeOverrides}
      config={config}
      defaultTheme={defaultTheme}
    >
      {adapterFactory ? (
        <InjectedGovernanceWidgetContent
          adapterFactory={adapterFactory}
          adapterInput={adapterInput}
          testId={testId}
        />
      ) : (
        <DefaultGovernanceWidgetContent adapterInput={adapterInput} testId={testId} />
      )}
    </GovernanceWidgetProvider>
  )
}
