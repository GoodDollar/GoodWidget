import type { CampaignMockData } from './widgetRuntimeContract'

// ---------------------------------------------------------------------------
// DEFAULT_CAMPAIGN_MOCK_DATA
//
// Static fixture satisfying the approved #127 content mockup. Leaderboard
// rows are sourced live from the Superfluid Points API (see
// useCampaignLeaderboard) rather than mock data — only the SUP-totals fields
// below remain placeholders, since that API has no SUP-allocated figures.
// Consumers can still override the content fixture via
// SuperfluidCampaignWidgetProps.data.
// ---------------------------------------------------------------------------

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
      campaignId: 606,
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
      campaignId: 614,
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
  // supDistributed/supTotal/totalParticipants/lastUpdatedLabel remain placeholders:
  // the live Points API (see useCampaignLeaderboard) has no SUP-allocation totals,
  // only points fields — confirmed gap, reported separately to the campaign owner.
  leaderboard: {
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
