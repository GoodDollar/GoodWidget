import React, { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Text, XStack, YStack } from '@goodwidget/ui'
import {
  AlignmentVotingProposalCard,
  BalanceCard,
  FundingDistributionChart,
  ImpactCard,
  OptimisticVotingProposalCard,
} from '@goodwidget/governance-widget'
import type {
  FundingProjectAllocation,
  RankedVotingOption,
  VoteSegment,
  VoterPreview,
} from '@goodwidget/governance-widget'

const meta: Meta = {
  title: 'Widgets/GovernanceWidget',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    goodWidgetProvider: { useShell: false, defaultTheme: 'light' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const alignmentOptions: RankedVotingOption[] = [
  { id: 'food-chain', label: 'Local Food Chain', percentage: 42 },
  { id: 'web3-literacy', label: 'Web3 Literacy', percentage: 31 },
  { id: 'civic-onboarding', label: 'Civic Onboarding', percentage: 27 },
  { id: 'regenerative-markets', label: 'Regenerative Markets', percentage: 18 },
]

const voteSegments: VoteSegment[] = [
  { id: 'for', label: 'For', percentage: 65, tone: 'for' },
  { id: 'against', label: 'Against', percentage: 10, tone: 'against' },
  { id: 'abstain', label: 'Abstain', percentage: 3, tone: 'abstain' },
]

const lowQuorumSegments: VoteSegment[] = [
  { id: 'for', label: 'For', percentage: 24, tone: 'for' },
  { id: 'against', label: 'Against', percentage: 18, tone: 'against' },
  { id: 'abstain', label: 'Abstain', percentage: 8, tone: 'abstain' },
]

const mayaAvatar =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2232%22 fill=%22%232563eb%22/%3E%3Ctext x=%2232%22 y=%2239%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2224%22 font-weight=%22700%22 fill=%22white%22%3EM%3C/text%3E%3C/svg%3E'

const voters: VoterPreview[] = [
  { id: 'maya', label: 'Maya', avatarUrl: mayaAvatar },
  { id: 'kenji', label: 'Kenji' },
  { id: 'sol', label: 'Sol' },
  { id: 'ama', label: 'Ama' },
]

const fundingProjects: FundingProjectAllocation[] = [
  { id: 'food', name: 'Local Food Chain', amount: { value: 12400, token: 'G$', isStreaming: true }, percentage: 42 },
  { id: 'literacy', name: 'Web3 Literacy for Community Builders', amount: { value: 9100, token: 'G$' }, percentage: 31 },
  { id: 'civic', name: 'Civic Onboarding', amount: { value: 7900, token: 'G$' }, percentage: 27 },
]

function GovernanceStoryFrame({ children, width = 520 }: { children: React.ReactNode; width?: number }) {
  const [lastAction, setLastAction] = useState('No interaction yet')

  // Mocked handlers make interaction affordances visible without wiring runtime data.
  const enhancedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) {
      return child
    }

    return React.cloneElement(child, {
      onPress: (id: string) => setLastAction(`Opened ${id}`),
      onCtaPress: () => setLastAction('CTA pressed'),
      onProjectPress: (id: string) => setLastAction(`Opened project ${id}`),
    } as Record<string, unknown>)
  })

  return (
    <YStack width={width} maxWidth="100%" gap="$3" padding="$3">
      {enhancedChildren}
      <Text variant="caption" tone="secondary" data-testid="GovernanceWidget-last-action">
        {lastAction}
      </Text>
    </YStack>
  )
}

export const ImpactLight: Story = {
  render: () => (
    <GovernanceStoryFrame>
      <ImpactCard
        testID="ImpactCard-light"
        title="Community impact this month"
        metrics={[
          { label: 'Distributed', amount: { value: 348000, token: 'G$' }, description: 'Across verified community projects' },
          { label: 'Streaming now', amount: { value: 12800, token: 'G$', isStreaming: true, streamLabel: 'G$ / month live' }, description: 'Active flow to approved recipients' },
        ]}
        description="Track how governance funding turns into measurable economic activity for GoodDollar members."
        ctaLabel="View impact report"
      />
    </GovernanceStoryFrame>
  ),
}

export const ImpactDarkLongDisabledMobile: Story = {
  parameters: { goodWidgetProvider: { useShell: false, defaultTheme: 'dark' }, viewport: { defaultViewport: 'mobile1' } },
  render: () => (
    <GovernanceStoryFrame width={328}>
      <ImpactCard
        testID="ImpactCard-dark-mobile-disabled"
        title="Long-running regional resilience campaign with intentionally verbose title"
        metrics={[
          { label: 'Committed', amount: { value: 914000, token: 'G$' } },
          { label: 'Live stream', amount: { value: 42500, token: 'G$', isStreaming: true, streamLabel: 'Streaming every month' } },
        ]}
        description="This longer description validates wrapping and mobile stacking without relying on runtime data or contract reads."
        ctaLabel="Coming soon"
        ctaDisabled
      />
    </GovernanceStoryFrame>
  ),
}

export const BalanceVariantsLight: Story = {
  render: () => (
    <XStack flexWrap="wrap" gap="$3" padding="$3" width={600}>
      <BalanceCard
        testID="BalanceCard-token-growth"
        icon="wallet"
        title="Voting balance"
        amount={{ value: 12345.67, token: 'G$' }}
        metadataType="growth"
        metadata={{ label: '+12.4% this cycle', tone: 'positive', icon: 'chevron-up' }}
      />
      <BalanceCard
        testID="BalanceCard-raw-window"
        icon="check"
        title="Eligible proposals with a long title"
        amount={17}
        amountType="raw"
        metadataType="time-window"
        metadata={{ label: 'Last 30 days', tone: 'muted', icon: 'info' }}
      />
    </XStack>
  ),
}

export const BalanceDarkCompact: Story = {
  parameters: { goodWidgetProvider: { useShell: false, defaultTheme: 'dark' } },
  render: () => (
    <GovernanceStoryFrame width={252}>
      <BalanceCard
        testID="BalanceCard-dark-compact"
        compact
        icon="wallet"
        title="Compact delegated voting power with truncation"
        amount={{ value: 7821, token: 'G$' }}
        metadataType="time-window"
        metadata={{ label: 'Snapshot in 3 days', tone: 'muted', icon: 'info' }}
      />
    </GovernanceStoryFrame>
  ),
}

export const AlignmentDefaultLight: Story = {
  render: () => (
    <GovernanceStoryFrame>
      <AlignmentVotingProposalCard
        testID="AlignmentVotingProposalCard-default"
        id="alignment-q3"
        categoryLabel="Alignment Vote"
        title="Q3 House Of Alignment Funding Allocation"
        summaryLabel="Current top 3 voted"
        options={alignmentOptions}
        maxVisibleOptions={3}
      />
    </GovernanceStoryFrame>
  ),
}

export const AlignmentDarkLongOptions: Story = {
  parameters: { goodWidgetProvider: { useShell: false, defaultTheme: 'dark' } },
  render: () => (
    <GovernanceStoryFrame>
      <AlignmentVotingProposalCard
        testID="AlignmentVotingProposalCard-dark-long"
        id="alignment-long"
        categoryLabel="Budget Allocation"
        title="Very long alignment voting proposal title that validates multi-line wrapping and still keeps the ranked options readable"
        summaryLabel="Leading weighted vote units"
        options={alignmentOptions}
        maxVisibleOptions={2}
      />
    </GovernanceStoryFrame>
  ),
}

export const OptimisticHighQuorumLight: Story = {
  render: () => (
    <GovernanceStoryFrame>
      <OptimisticVotingProposalCard
        testID="OptimisticVotingProposalCard-high-quorum"
        id="gip-43"
        categoryLabel="Proposal GIP-43"
        title="Approve House of Alignment funding allocation"
        quorumLabel="Current Vote Quorum"
        quorumReachedPercent={78}
        voteSegments={voteSegments}
        voters={voters}
        remainingVoterCountLabel="+1.2k"
      />
    </GovernanceStoryFrame>
  ),
}

export const OptimisticDarkLowQuorumMixed: Story = {
  parameters: { goodWidgetProvider: { useShell: false, defaultTheme: 'dark' } },
  render: () => (
    <GovernanceStoryFrame>
      <OptimisticVotingProposalCard
        testID="OptimisticVotingProposalCard-low-quorum"
        id="gip-44"
        categoryLabel="Optimistic Vote"
        title="Challenge window for updated seasonal member metadata and recipient weights"
        quorumLabel="Minimum participation"
        quorumReachedPercent={39}
        voteSegments={lowQuorumSegments}
        voters={voters.slice(0, 3)}
        remainingVoterCountLabel="+84"
      />
    </GovernanceStoryFrame>
  ),
}

export const FundingDistributionLight: Story = {
  render: () => (
    <GovernanceStoryFrame width={660}>
      <FundingDistributionChart
        testID="FundingDistributionChart-populated"
        totalAmount={{ value: 29400, token: 'G$', isStreaming: true, streamLabel: 'Live total' }}
        isStreaming
        projects={fundingProjects}
      />
    </GovernanceStoryFrame>
  ),
}

export const FundingDistributionDarkEmptyMobile: Story = {
  parameters: { goodWidgetProvider: { useShell: false, defaultTheme: 'dark' }, viewport: { defaultViewport: 'mobile1' } },
  render: () => (
    <GovernanceStoryFrame width={328}>
      <FundingDistributionChart
        testID="FundingDistributionChart-empty-dark-mobile"
        totalAmount={{ value: 0, token: 'G$', isStreaming: true, streamLabel: 'No active stream' }}
        isStreaming
        projects={[]}
      />
    </GovernanceStoryFrame>
  ),
}
