import type { CampaignDefinition } from './widgetRuntimeContract'

// ---------------------------------------------------------------------------
// DEFAULT_CAMPAIGN_DEFINITION
//
// Stable configuration satisfying the approved #127 campaign definition. Leaderboard
// rows are sourced live from the Superfluid Points API (see
// useCampaignLeaderboard). Pool totals and aggregate figures are deliberately
// not part of this definition because they
// have no authoritative live source. Consumers can override stable content via
// SuperfluidCampaignWidgetProps.data.
//
// pointsEventNames below are the canonical event-producer contract assumed by
// the widget. If an existing producer uses different names, pass data with the
// corresponding aliases instead of changing ActivityType or the icon mapping.
// ---------------------------------------------------------------------------

const POINTS_EVENT_NAMES = {
  claimUbi: 'claimed',
  inviteUsers: 'validInvites',
  flowStateFunding: 'roundStreamed',
  gardensDonation: 'opensourceSent',
  gardensFunding: 'opensourceStreamed',
  // TODO: Replace when the Flow State voting points producer is implemented.
  // Keeping a distinct placeholder preserves the action and icon flow without
  // incorrectly treating another event as proof that the user voted.
  flowStateVote: 'roundVotes',
} as const

export const DEFAULT_CAMPAIGN_DEFINITION: CampaignDefinition = {
  seasonLabel: 'SEASON 6',
  title: 'Superfluid Ecosystem Rewards',
  description:
    'Complete eligible actions across GoodDollar, Flow State, and Gardens to earn SUP rewards.',
  endsLabel: 'Ends 30 September',
  pools: [
    {
      id: 'good-dollar-actions',
      campaignId: 606,
      label: 'GoodDollar actions',
      actions: [
        {
          activity: 'claim-ubi',
          pointsEventNames: [POINTS_EVENT_NAMES.claimUbi],
          title: 'Claim UBI',
          source: 'GoodDollar',
          description: 'Claim your daily G$. Earn every time you claim.',
          pointsLabel: '1 PT PER CLAIM',
          ctaLabel: 'Claim',
          ctaKind: 'claim-widget-claim',
        },
        {
          activity: 'invite-users',
          pointsEventNames: [POINTS_EVENT_NAMES.inviteUsers],
          title: 'Invite users',
          source: 'GoodDollar',
          description: 'Invite someone to claim G$ through GoodWallet.',
          pointsLabel: '10 PTS PER INVITE',
          ctaLabel: 'Invite',
          ctaKind: 'external-link',
          href: 'https://goodwallet.xyz/en/gooddollar',
        },
        {
          activity: 'flow-state-vote',
          pointsEventNames: [POINTS_EVENT_NAMES.flowStateVote],
          title: 'Vote on Flow State',
          source: 'Flow State',
          description: 'Vote to help allocate GoodBuilders Season 4 funding.',
          pointsLabel: '5 PTS PER VOTE',
          ctaLabel: 'Vote',
          ctaKind: 'external-link',
          href: 'https://flowstate.network/flow-councils/42220/0x582e3314d4ef56c18930acb10bb64313525e7820',
        },
      ],
    },
    {
      id: 'ecosystem-funding-actions',
      campaignId: 614,
      label: 'Ecosystem actions',
      actions: [
        {
          activity: 'flow-state-funding',
          pointsEventNames: [POINTS_EVENT_NAMES.flowStateFunding],
          title: 'Fund GoodBuilders Season 4',
          source: 'Flow State',
          description: 'Start a stream to the GoodBuilders Season 4 pool.',
          pointsLabel: '2 PTS PER $1 STREAMED',
          ctaLabel: 'Fund',
          ctaKind: 'external-link',
          href: 'https://flowstate.network/flow-councils/42220/0x582e3314d4ef56c18930acb10bb64313525e7820',
        },
        {
          activity: 'gardens-donation',
          pointsEventNames: [POINTS_EVENT_NAMES.gardensDonation],
          title: 'Make a one-time donation',
          source: 'Gardens',
          description: 'Donate to an eligible Community Pool.',
          pointsLabel: '1 PT PER $1 DONATED',
          ctaLabel: 'Donate',
          ctaKind: 'external-link',
          href: 'https://app.gardens.fund/gardens/42220/0xf42c9ca2b10010142e2bac34ebdddb0b82177684',
        },
        {
          activity: 'gardens-funding',
          pointsEventNames: [POINTS_EVENT_NAMES.gardensFunding],
          title: 'Stream to a Community Pool',
          source: 'Gardens',
          description: 'Start a stream to an eligible Community Pool.',
          pointsLabel: '2 PTS PER $1 STREAMED',
          ctaLabel: 'Fund',
          ctaKind: 'external-link',
          href: 'https://app.gardens.fund/gardens/42220/0xf42c9ca2b10010142e2bac34ebdddb0b82177684',
        },
      ],
    },
  ],
  // Exact FAQ copy from issue #127 — do not paraphrase, this is user-facing legal/support text.
  faq: [
    {
      question: 'What is SUP?',
      answer:
        'SUP is the governance and rewards token of the Superfluid ecosystem. It may have a market value, but its price can change. This campaign rewards SUP tokens, not a guaranteed cash amount.',
    },
    {
      question: 'How are my SUP rewards calculated?',
      answer:
        'Two separate reward pools: GoodDollar actions, and Ecosystem actions. Your share of each pool depends on how many points you earn compared with everyone else in that pool. Rewards from both pools are then combined.',
    },
    {
      question: 'When does an invite count as successful?',
      answer:
        'An invite counts after the invited user completes three G$ claims. The invite reward is registered when they complete their fourth claim.',
    },
    {
      question: 'How do Flow State voting points work?',
      answer:
        'GoodBuilders Season 4 has six voting epochs. You earn 5 points each time you complete the vote for an epoch, for a maximum of 30 points during the campaign.',
    },
    {
      question: 'How do I start receiving SUP?',
      answer:
        'First, complete eligible campaign actions to earn points. Then: open the Superfluid Claim App (claim.superfluid.org), connect the same wallet you used for the campaign, set up your Superfluid Reserve, choose a governance delegate, and claim your SUP. This starts your SUP reward stream.',
    },
    {
      question: 'What happens after I claim?',
      answer:
        'Keep completing eligible actions to earn more points. Return to the Claim App regularly (Superfluid recommends checking daily). GoodDollar subsidizes one transaction on Base per user each month.',
    },
    {
      question: 'Do my rewards arrive automatically?',
      answer:
        'No. Your campaign activity earns points, but you need to open the Superfluid Claim App and claim your available SUP.',
    },
    {
      question: 'Where does my SUP go?',
      answer:
        'Your claimed SUP streams into your Superfluid Reserve, manageable at claim.superfluid.org/reserve.',
    },
    {
      question: 'Can I earn SUP from other campaigns?',
      answer:
        'Yes — visit Discover, Use and Earn (claim.superfluid.org/apps) to explore other eligible campaigns.',
    },
    {
      question: 'Which network is used to claim SUP?',
      answer: 'Base.',
    },
    {
      question: 'Do I need ETH for gas?',
      answer:
        'You may need a small amount of ETH on Base. GoodDollar subsidizes one eligible gas transaction per user each month; additional transactions may require your own ETH.',
    },
    {
      question: 'What should I do if the gas transaction fails?',
      answer:
        'Wait a few minutes, then check BaseScan (basescan.org) to confirm a non-zero ETH balance on Base. Check/update the gas fee suggestion in your wallet (e.g. MetaMask) and retry. If it persists, contact the GoodDollar Telegram support group (t.me/GoodDollarX).',
    },
  ],
}
