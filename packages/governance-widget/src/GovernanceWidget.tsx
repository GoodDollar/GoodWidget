import { useMemo } from 'react'
import { Button, ButtonText, Card, Heading, Icon, Input, Spinner, Text, XStack, YStack } from '@goodwidget/ui'
import { AlignmentVotingProposalCard } from './AlignmentVotingProposalCard'
import { BalanceCard } from './BalanceCard'
import { FundingDistributionChart } from './FundingDistributionChart'
import { GovernanceOnboardingWidget } from './GovernanceOnboardingWidget'
import { GovernanceWidgetProvider } from './GovernanceWidgetProvider'
import { ImpactCard } from './ImpactCard'
import { useGovernanceAdapter } from './adapter'
import type {
  GovernanceWidgetAdapterActions,
  GovernanceWidgetAdapterFactoryInput,
  GovernanceWidgetAdapterResult,
  GovernanceWidgetAdapterState,
  GovernanceWidgetProps,
} from './widgetRuntimeContract'
import { isActiveStatus } from './adapter'
import { formatStakeAmount } from './sdks/contracts'

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
  const addressLabel = state.address ? `${state.address.slice(0, 6)}…${state.address.slice(-4)}` : null

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
        {state.address ? (
          <YStack alignItems="flex-end" gap="$1">
            <Text variant="caption" tone="secondary">
              Connected wallet
            </Text>
            <Text fontWeight="700">{addressLabel}</Text>
          </YStack>
        ) : (
          <Button
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
  return (
    <YStack gap="$4" width="100%" data-testid="GovernanceWidget-dashboard">
      <ImpactCard {...state.dashboard.impact} testID="GovernanceWidget-impact" />
      <BalanceCard {...state.dashboard.activeMembers} testID="GovernanceWidget-active-members" />
      <AlignmentVotingProposalCard
        id={state.dashboard.alignmentVoting.voteId}
        categoryLabel="Alignment Voting"
        title={state.dashboard.alignmentVoting.title}
        summaryLabel={state.dashboard.alignmentVoting.summaryLabel}
        options={state.dashboard.alignmentVoting.options}
        testID="GovernanceWidget-active-governance"
        onPress={() => actions.openVote()}
      />
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

function MemberFooter({ state }: { state: GovernanceWidgetAdapterState }) {
  if (!state.member || !isActiveStatus(state.status)) return null

  return (
    <Card outlined data-testid="GovernanceWidget-member-footer">
      <XStack alignItems="center" justifyContent="space-between" gap="$3" flexWrap="wrap">
        <Text variant="caption" tone="secondary">
          House: {state.member.house === 'alignment' ? 'House of Alignment' : 'House of Citizenship'}
        </Text>
        <Text variant="caption" tone="secondary">
          Joined: {formatMemberDate(state.member.joinedAt)}
        </Text>
        <Text variant="caption" tone="secondary">
          Status: {state.member.status}
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
  const vote = state.dashboard.alignmentVoting
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
          <Button variant="secondary" onPress={actions.closeVote}>
            <ButtonText>Back</ButtonText>
          </Button>
        </XStack>
        <Text tone="secondary">
          Allocate basis points across the recipients captured when this vote opened.
          Your allocation must total exactly 10,000 basis points.
        </Text>
        <YStack gap="$3">
          {vote.options.map((option) =>
            isReadOnly ? (
              <Text key={option.id} tone="secondary">
                {option.label}: {vote.executed ? `${vote.finalizedUnits[option.id] ?? '0'} finalized units` : `${vote.allocationsBps[option.id] ?? 0} bps`}
              </Text>
            ) : (
              <Input
                key={option.id}
                label={option.label}
                value={String(vote.allocationsBps[option.id] ?? 0)}
                inputMode="numeric"
                onChangeText={(value) => actions.setVoteAllocation(option.id, Number.parseInt(value || '0', 10))}
              />
            ),
          )}
        </YStack>
        <Text tone={vote.allocationTotalBps === 10000 ? 'default' : 'secondary'}>
          Allocation total: {vote.allocationTotalBps} / 10,000 bps
        </Text>
        {vote.hasVoted ? (
          <Text color="$success" fontWeight="700">
            Already voted — this contract does not support ballot replacement.
          </Text>
        ) : null}
        {!canSubmit && !voteTransactionPending ? (
          <Text tone="secondary">{vote.disabledReason ?? 'Voting is unavailable.'}</Text>
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
  const shouldShowDashboard =
    state.status === 'disconnected' ||
    state.status === 'loading' ||
    state.status === 'unsupported_chain' ||
    state.status === 'friendly_error' ||
    isActiveStatus(state.status)

  return (
    <YStack gap="$4" width="100%" data-testid={testId ?? 'GovernanceWidget'}>
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
      {state.status === 'onboarding_required' ? (
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
            disabledHouseOptions={state.disabledHouseOptions}
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
        </YStack>
      ) : null}
      {state.status === 'pending_alignment' ? <PendingAlignmentState state={state} /> : null}
      {state.status === 'revoked' ? <RevokedState state={state} /> : null}
      {shouldShowDashboard ? <GovernanceDashboard state={state} actions={actions} /> : null}
      <MemberFooter state={state} />
      {isActiveStatus(state.status) ? <MembershipExitState state={state} actions={actions} /> : null}
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
