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

// Standalone-app tracking links for the AntSeed actions. Integrators with their
// own tracked links (e.g. GoodWallet) replace them through `actionLinks`.
const BUY_AI_CREDITS_URL = 'https://ubi.gd/3UFIqH3'
const SUBSCRIBE_AI_CREDITS_URL = 'https://ubi.gd/4AslL0c'

export const DEFAULT_CAMPAIGN_DEFINITION: CampaignDefinition = {
  seasonLabel: 'SEASON 7',
  title: 'Superfluid Ecosystem Rewards',
  description:
    'Complete eligible actions across GoodDollar, Flow State, Gardens, and AI Credits to earn SUP rewards.',
  endsLabel: 'Ends Feb 28th',
  pools: [
    {
      id: 'good-dollar-actions',
      // Season 7 "GoodDollar actions" program (slug s7-gooddollar).
      campaignId: 701,
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
          ctaLabel: 'Coming up soon',
          ctaKind: 'external-link',
          // Invites are not eligible for Season 7 points yet: no link until they are enabled.
          disabled: true,
        },
        {
          activity: 'flow-state-vote',
          pointsEventNames: [POINTS_EVENT_NAMES.flowStateVote],
          title: 'Vote on Flow State',
          source: 'Flow State',
          description: 'Vote to help allocate GoodBuilders Season 5 funding.',
          pointsLabel: '5 PTS PER VOTE',
          ctaLabel: 'Coming up soon',
          ctaKind: 'external-link',
          disabled: true,
        },
      ],
    },
    {
      id: 'ecosystem-funding-actions',
      // Season 7 "Ecosystem actions" program (slug s7-gooddollar-2).
      campaignId: 710,
      label: 'Ecosystem actions',
      actions: [
        {
          activity: 'flow-state-funding',
          pointsEventNames: [POINTS_EVENT_NAMES.flowStateFunding],
          title: 'Fund GoodBuilders Season 5',
          source: 'Flow State',
          description: 'Start a stream to the GoodBuilders Season 5 pool.',
          pointsLabel: '2 PTS PER 1K G$ (≈ $0.1)',
          ctaLabel: 'Coming up soon',
          ctaKind: 'external-link',
          disabled: true,
        },
        {
          activity: 'gardens-donation',
          pointsEventNames: [POINTS_EVENT_NAMES.gardensDonation],
          title: 'Make a one-time donation',
          source: 'Gardens',
          description: 'Donate to an eligible Community Pool.',
          pointsLabel: '1 PT PER 1K G$ (≈ $0.1)',
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
          pointsLabel: '2 PTS PER 1K G$ (≈ $0.1)',
          ctaLabel: 'Fund',
          ctaKind: 'external-link',
          href: 'https://app.gardens.fund/gardens/42220/0xf42c9ca2b10010142e2bac34ebdddb0b82177684',
        },
        {
          activity: 'ai-credits-purchase',
          // TODO: set pointsEventNames to the AntSeed producer's event names once the
          // first wallets complete these actions; until then the leaderboard falls back
          // to the canonical activity name. Points reward the G$ deposited, never the
          // later use of the credits.
          title: 'Buy AI Credits',
          source: 'AntSeed',
          description: 'Make a one-time deposit in G$ to buy AI Credits.',
          minimumInfo: 'Minimum first deposit: $1. No minimum for subsequent deposits.',
          pointsLabel: '1 PT PER 1K G$ (≈ $0.1)',
          ctaLabel: 'Buy AI Credits',
          ctaKind: 'external-link',
          href: BUY_AI_CREDITS_URL,
        },
        {
          activity: 'ai-credits-subscription',
          // TODO: set pointsEventNames to the AntSeed producer's event names (see above).
          title: 'Subscribe to AI Credits',
          source: 'AntSeed',
          description: 'Subscribe with a G$ stream to buy AI Credits continuously.',
          pointsLabel: '2 PTS PER 1K G$ (≈ $0.1)',
          ctaLabel: 'Subscribe',
          ctaKind: 'external-link',
          href: SUBSCRIBE_AI_CREDITS_URL,
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
      question: 'How can I get G$?',
      answer: [
        [
          'You can ',
          { text: 'claim G$ for free', href: 'https://ubi.gd/4bE4Ptz' },
          ', or get G$ from the ',
          { text: 'GoodReserve', href: 'https://ubi.gd/45VZE4I' },
          ' or supported DEXs on Celo.',
        ],
      ],
    },
    {
      question: 'Can I earn points for inviting users?',
      answer: 'Invite rewards are coming up soon. Invites are currently not eligible for Season 7 points.',
    },
    {
      question: 'How can I earn points by buying AI Credits?',
      answer:
        'Buy AntSeed AI Credits with G$ through a one-time deposit or a streaming subscription. Deposits earn 1 point per $0.10 in G$, and subscriptions earn 2 points per $0.10 in G$ successfully streamed. Your first deposit must be at least $1, and subscriptions must stream at least $1 per month. Using the AI Credits does not earn additional points.',
    },
    {
      question: 'What can I do with AI Credits?',
      answer: [
        [
          'Use your G$ to buy AI Credits for supported tools such as Claude Code and Codex through AntSeed. GoodDollar-verified wallets get 10% more credits on one-time deposits or 20% more on streaming subscriptions, alongside the SUP rewards available through this campaign. Using your credits requires a desktop computer.',
        ],
        [{
            text: 'Learn more and get started',
            href: BUY_AI_CREDITS_URL,
            actionLinkActivity: 'ai-credits-purchase',
          }],
      ],
    },
    {
      question: 'How do I start receiving SUP?',
      answer:
        "Complete eligible campaign actions to earn points. Then go to the Superfluid Claim App, connect the same wallet you used for the campaign, and click Claim. You'll create or update your Superfluid Reserve, where your SUP rewards are received. Once confirmed, your SUP reward stream will start.",
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
      question: 'What can I do with my SUP after claiming?',
      answer: [
        [
          'Your SUP rewards are deposited into your Superfluid Reserve. From there, you can choose how to use or access them:',
        ],
        {
          type: 'bullets',
          items: [
            [
              'Stake your SUP to earn additional SUP rewards. Staked SUP can be partially or fully unstaked after a minimum of 30 days from your last staking action.',
            ],
            [
              'Stream your SUP to your wallet over time, with withdrawals available over a period of up to 12 months.',
            ],
            ['Withdraw immediately using the Drain option, which applies a Community Charge.'],
          ],
        },
        ['You can manage these options through the Superfluid Claim App.'],
      ],
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
    {
      question: 'Why are some actions marked ‘Coming up soon’?',
      answer:
        'Invites, GoodBuilders voting, and GoodBuilders funding are not available for Season 7 points yet. These cards will be enabled when the actions become available.',
    },
  ],
}
