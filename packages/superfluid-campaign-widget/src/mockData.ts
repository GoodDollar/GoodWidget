import type { CampaignMockData } from './widgetRuntimeContract'

// ---------------------------------------------------------------------------
// DEFAULT_CAMPAIGN_MOCK_DATA
//
// Static fixture satisfying the approved #127 content + leaderboard mockups.
// This phase renders UI against mock data only — no live points/leaderboard
// API integration. Consumers can override via SuperfluidCampaignWidgetProps.data.
// ---------------------------------------------------------------------------

/**
 * Six representative leaderboard rows spanning ranks 1-909, split into the
 * always-visible top/bottom bands the mockup shows around the "..." gap.
 */
const TOP_LEADERBOARD_ENTRIES = [
  { rank: 1, address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', ensName: 'flowmaster.eth', points: 4820, completedActivities: ['claim-ubi', 'invite-users', 'flow-state-vote', 'flow-state-funding', 'gardens-donation', 'gardens-funding'] as const },
  { rank: 2, address: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c', ensName: 'superflow.eth', points: 4390, completedActivities: ['claim-ubi', 'invite-users', 'flow-state-vote', 'gardens-donation', 'gardens-funding'] as const },
  { rank: 3, address: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d', points: 3910, completedActivities: ['claim-ubi', 'flow-state-vote', 'flow-state-funding', 'gardens-funding'] as const },
  { rank: 4, address: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e', ensName: 'gardener.eth', points: 3420, completedActivities: ['claim-ubi', 'invite-users', 'gardens-donation'] as const },
  { rank: 5, address: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f', points: 2985, completedActivities: ['claim-ubi', 'flow-state-vote', 'gardens-funding'] as const },
]

const BOTTOM_LEADERBOARD_ENTRIES = [
  { rank: 908, address: '0xa0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9', points: 12, completedActivities: ['claim-ubi'] as const },
  { rank: 909, address: '0xb1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0', points: 8, completedActivities: [] as const },
]

/** Connected-only row — rendered in "Your position" and inserted into the ranked table. */
const CURRENT_USER_ENTRY = {
  rank: 342,
  address: '0x7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e',
  ensName: 'you.eth',
  points: 186,
  completedActivities: ['claim-ubi', 'invite-users'] as const,
}

export const DEFAULT_CAMPAIGN_MOCK_DATA: CampaignMockData = {
  seasonLabel: 'SEASON 6',
  title: 'Superfluid Ecosystem Rewards',
  description:
    'Earn SUP by claiming G$, inviting new users, voting on Flow State to help allocate funding, and supporting GoodBuilders through Flow State and Gardens.',
  supAllocatedLabel: '622K SUP allocated',
  endsLabel: 'Ends 30 September',
  pools: [
    {
      id: 'good-dollar-actions',
      label: 'GoodDollar actions',
      supDistributed: 75895,
      supTotal: 217700,
      participants: 624,
      actions: [
        {
          activity: 'claim-ubi',
          title: 'Claim UBI',
          source: 'GoodDollar',
          description: 'Claim your daily G$. The more days you claim, the more points you earn.',
          pointsLabel: '1 POINT PER CLAIM',
          ctaLabel: 'Claim',
          ctaKind: 'claim-widget-claim',
        },
        {
          activity: 'invite-users',
          title: 'Invite users',
          source: 'GoodDollar',
          description: 'Invite someone to claim G$ through GoodWallet.',
          pointsLabel: '10 POINTS PER INVITE',
          ctaLabel: 'Invite',
          ctaKind: 'claim-widget-invite',
        },
        {
          activity: 'flow-state-vote',
          title: 'Vote on Flow State',
          source: 'Flow State',
          description: 'Vote to help decide how GoodBuilders Season 4 participants receive funding.',
          pointsLabel: '5 POINTS PER VOTE',
          ctaLabel: 'Vote',
          ctaKind: 'external-link',
          href: 'https://flowstate.network/flow-councils/42220/0x582e3314d4ef56c18930acb10bb64313525e7820',
        },
      ],
    },
    {
      id: 'ecosystem-funding-actions',
      label: 'Ecosystem funding actions',
      supDistributed: 262450,
      supTotal: 404300,
      participants: 318,
      actions: [
        {
          activity: 'flow-state-funding',
          title: 'Fund GoodBuilders Season 4',
          source: 'Flow State',
          description: 'Open a funding stream to the GoodBuilders Season 4 pool.',
          pointsLabel: '2 POINTS PER $1 STREAMED',
          ctaLabel: 'Fund',
          ctaKind: 'external-link',
          href: 'https://flowstate.network/flow-councils/42220/0x582e3314d4ef56c18930acb10bb64313525e7820',
        },
        {
          activity: 'gardens-donation',
          title: 'Make a one-time donation',
          source: 'Gardens',
          description: 'Make a one-time donation to an eligible GoodBuilders Community Pool.',
          pointsLabel: '1 POINT PER $1 DONATED',
          ctaLabel: 'Donate',
          ctaKind: 'external-link',
          href: 'https://app.gardens.fund/gardens/42220/0xf42c9ca2b10010142e2bac34ebdddb0b82177684',
        },
        {
          activity: 'gardens-funding',
          title: 'Stream to a Community Pool',
          source: 'Gardens',
          description: 'Open a funding stream to an eligible GoodBuilders Community Pool.',
          pointsLabel: '2 POINTS PER $1 STREAMED',
          ctaLabel: 'Fund',
          ctaKind: 'external-link',
          href: 'https://app.gardens.fund/gardens/42220/0xf42c9ca2b10010142e2bac34ebdddb0b82177684',
        },
      ],
    },
  ],
  leaderboard: {
    topEntries: TOP_LEADERBOARD_ENTRIES.map((entry) => ({
      ...entry,
      completedActivities: [...entry.completedActivities],
    })),
    bottomEntries: BOTTOM_LEADERBOARD_ENTRIES.map((entry) => ({
      ...entry,
      completedActivities: [...entry.completedActivities],
    })),
    // null here represents the disconnected view; SuperfluidCampaignWidget swaps in
    // CURRENT_USER_ENTRY-shaped data once useWallet() reports a connected address.
    currentUserEntry: null,
    totalParticipants: 2184,
    supDistributed: 316300,
    supTotal: 622000,
    lastUpdatedLabel: 'Last updated: 18m ago',
  },
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
        'Two separate reward pools: GoodDollar actions, and Ecosystem funding actions. Your share of each pool depends on how many points you earn compared with everyone else in that pool. Rewards from both pools are then combined.',
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
      answer: 'No. Your campaign activity earns points, but you need to open the Superfluid Claim App and claim your available SUP.',
    },
    {
      question: 'Where does my SUP go?',
      answer: 'Your claimed SUP streams into your Superfluid Reserve, manageable at claim.superfluid.org/reserve.',
    },
    {
      question: 'Can I earn SUP from other campaigns?',
      answer: 'Yes — visit Discover, Use and Earn (claim.superfluid.org/apps) to explore other eligible campaigns.',
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

/** Connected-view variant of the mock dataset, with a populated currentUserEntry. */
export const CONNECTED_CAMPAIGN_MOCK_DATA: CampaignMockData = {
  ...DEFAULT_CAMPAIGN_MOCK_DATA,
  leaderboard: {
    ...DEFAULT_CAMPAIGN_MOCK_DATA.leaderboard,
    currentUserEntry: { ...CURRENT_USER_ENTRY, completedActivities: [...CURRENT_USER_ENTRY.completedActivities] },
  },
}
