import { useMemo } from 'react'
import { Button, ButtonText, Card, Heading, Input, Spinner, Text, XStack, YStack } from '@goodwidget/ui'
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
  GovernanceWidgetAdapterState,
  GovernanceWidgetProps,
} from './widgetRuntimeContract'
import { isActiveStatus } from './adapter'

function formatMemberDate(timestamp: number | null): string {
  if (!timestamp) return 'Not available'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(timestamp),
  )
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
    <Card outlined data-testid="GovernanceWidget-header">
      <XStack alignItems="center" justifyContent="space-between" gap="$3" flexWrap="wrap">
        <YStack gap="$1" flex={1} minWidth={220}>
          <Heading level={3}>GoodDAO Governance</Heading>
          <Text tone="secondary">
            Browse governance impact, funding distribution, and active Alignment voting.
          </Text>
        </YStack>
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
    </Card>
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
              'No active Alignment recipients are available for this vote.'}
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
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Your House of Alignment application is waiting for committee approval.
        </Text>
        <Text variant="caption" tone="secondary">
          Wallet: {state.address ?? 'Not connected'}
        </Text>
      </YStack>
    </Card>
  )
}

function RestakeState({
  state,
  actions,
}: {
  state: GovernanceWidgetAdapterState
  actions: GovernanceWidgetAdapterActions
}) {
  return (
    <Card data-testid="GovernanceWidget-restake">
      <YStack gap="$3">
        <Heading level={4}>Restore governance membership</Heading>
        <Text tone="secondary">
          This member is currently {state.member?.status ?? 'inactive'}. You can restake to rejoin the selected house.
        </Text>
        <Button
          onPress={() => {
            void actions.restake()
          }}
        >
          <ButtonText>Restake {state.stakeAmountLabel}</ButtonText>
        </Button>
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
  const canSubmit = vote.canVote && vote.allocationTotalBps === 10000 && !vote.hasVoted && vote.isVotingOpen

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
          Placeholder voting detail. Enter allocation basis points; totals must equal 10,000 before voting.
        </Text>
        <YStack gap="$3">
          {vote.options.map((option) => (
            <Input
              key={option.id}
              label={option.label}
              value={String(vote.allocationsBps[option.id] ?? 0)}
              inputMode="numeric"
              onChangeText={(value) => actions.setVoteAllocation(option.id, Number.parseInt(value || '0', 10))}
            />
          ))}
        </YStack>
        <Text tone={vote.allocationTotalBps === 10000 ? 'default' : 'secondary'}>
          Allocation total: {vote.allocationTotalBps} / 10,000 bps
        </Text>
        {vote.hasVoted ? (
          <Text color="$success" fontWeight="700">
            Already voted — this contract does not support ballot replacement.
          </Text>
        ) : null}
        {!canSubmit ? <Text tone="secondary">{vote.disabledReason ?? 'Voting is unavailable.'}</Text> : null}
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

function GovernanceWidgetContent({
  adapterFactory,
  adapterInput,
  testId,
}: {
  adapterFactory?: GovernanceWidgetProps['adapterFactory']
  adapterInput: GovernanceWidgetAdapterFactoryInput
  testId?: string
}) {
  const defaultAdapter = useGovernanceAdapter(adapterInput)
  const adapter = adapterFactory ? adapterFactory(adapterInput) : defaultAdapter
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
      {state.status === 'vote_detail' ? <GovernanceVoteDetail state={state} actions={actions} /> : null}
      {state.status === 'onboarding_required' ? (
        <GovernanceOnboardingWidget
          currentStepId={state.onboardingStepId}
          identityStatus={state.identityStatus}
          walletAddress={state.address ?? undefined}
          initialHouse={state.selectedHouse}
          disabledHouseOptions={state.disabledHouseOptions}
          initialProfileDraft={state.profileDraft}
          stakeAmountLabel={state.stakeAmountLabel}
          transactionSteps={state.transactionSteps}
          dataTestId="GovernanceWidget-onboarding"
          onHouseChange={actions.selectHouse}
          onProfileSubmit={(profileDraft) => {
            void actions.register(profileDraft)
          }}
        />
      ) : null}
      {state.status === 'pending_alignment' ? <PendingAlignmentState state={state} /> : null}
      {state.status === 'restake_required' ? <RestakeState state={state} actions={actions} /> : null}
      {shouldShowDashboard ? <GovernanceDashboard state={state} actions={actions} /> : null}
      <MemberFooter state={state} />
    </YStack>
  )
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
      <GovernanceWidgetContent
        adapterFactory={adapterFactory}
        adapterInput={adapterInput}
        testId={testId}
      />
    </GovernanceWidgetProvider>
  )
}
