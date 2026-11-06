export interface FaqLink {
  href: string
  linkText: string
  /** Optional lead-in text shown before the link, e.g. "More technical information:" */
  text?: string
}

export interface FaqEntry {
  id: string
  question: string
  /** Paragraphs, split on blank lines so each renders as its own block */
  answer: string[]
  links?: FaqLink[]
}

// Content ported from GoodProtocolUI's `faqMpbBridgeCopy`
// (src/components/Faq/copies.tsx) — the "Main Bridge" FAQ set, which covers
// the multi-provider (LayerZero/Axelar) Celo/Ethereum/Fuse/XDC routes this
// widget implements. GoodProtocolUI's sibling `faqBridgeCopy` set describes
// the older Fuse<->Celo-only MicroBridge, a different product this widget
// does not use, so it is intentionally not ported. This is a content
// reference only — no runtime dependency on GoodProtocolUI.
export const BRIDGE_FAQ_ITEMS: FaqEntry[] = [
  {
    id: 'whatismainbridge',
    question: 'What is the Main Bridge?',
    answer: [
      'A bridge is a tool built to transfer assets from one network to another. It’s also a verb, used to describe that action: “I bridged my G$ from Fuse to Celo.”',
      'GoodDollar operates across Fuse, Celo, Ethereum and XDC networks, and G$ tokens can be bridged across those networks.',
      'Thanks to the Main Bridge you can easily move G$ between supported GoodDollar networks directly from GoodDapp.',
      'Depending on the selected source and destination networks, different bridge providers and routes may be available.',
    ],
  },
  {
    id: 'supportednetworksroutes',
    question: 'Which networks and routes are supported?',
    answer: [
      'GoodDollar currently supports bridging across Fuse, Celo, Ethereum and XDC.',
      'Available bridge providers and routes depend on the selected source and destination networks. Currently, Axelar supports Ethereum ↔ Celo, and LayerZero supports all chains and routes.',
      'The available routes will update automatically depending on the selected route.',
    ],
  },
  {
    id: 'whocanusemainbridge',
    question: 'Who can use it?',
    answer: [
      'Anyone can use the Main Bridge, but there are a few requirements to ensure a smooth transfer of your G$ tokens:',
      '1. Wallet Compatibility — verify that your wallet is compatible with both the source and destination networks. Sending G$ to incompatible wallets may result in loss of funds.',
      '2. Gas Fees — using the Main Bridge requires native tokens to cover gas fees on the selected network (CELO on Celo, ETH on Ethereum, FUSE on Fuse, XDC on XDC). Make sure you have sufficient balances before bridging.',
    ],
  },
  {
    id: 'howdoesmainbridgework',
    question: 'How does it work?',
    answer: [
      'The Main Bridge uses bridge smart contracts and cross-chain messaging infrastructure to transfer G$ between supported networks, via providers including Axelar and LayerZero depending on the selected route.',
      'When you bridge G$: your G$ is sent through bridge contracts on the source network, the selected bridge provider verifies and relays the transaction across networks, and G$ is then released or minted on the destination network.',
    ],
    links: [
      {
        href: 'https://docs.gooddollar.org/user-guides/bridge-gooddollars',
        text: 'More technical information:',
        linkText: 'GoodDollar Documentation',
      },
    ],
  },
  {
    id: 'whichprovider',
    question: 'Which bridge provider should I use?',
    answer: [
      'In most cases, simply select the source network, select the destination network, and enter the amount you want to transfer.',
      'Currently, Axelar supports Ethereum ↔ Celo, and LayerZero supports all chains that G$ is active on (Celo, Fuse, XDC, Ethereum). For Ethereum ↔ Celo transfers, Axelar may provide lower fees depending on network conditions.',
    ],
  },
  {
    id: 'whatfeesmainbridge',
    question: 'What are the fees for using the Main Bridge?',
    answer: [
      'The fees for using the Main Bridge depend on the selected route and bridge provider, and may include protocol fees, native network gas fees, and bridge fees charged in native tokens.',
      'All bridge transactions require native gas tokens on the source network (CELO on Celo, ETH on Ethereum, FUSE on Fuse, XDC on XDC). Fees vary depending on the source/destination networks, selected provider, network congestion, and current gas costs.',
      'Estimated fees are shown below the bridge button. Ethereum-related transactions may incur higher gas fees depending on network activity.',
    ],
  },
  {
    id: 'whatlimitsmainbridge',
    question: 'What are the limits?',
    answer: ['You may bridge up to 300M G$ per transaction depending on route and provider availability.'],
  },
  {
    id: 'howlongbridging',
    question: 'How long does bridging take?',
    answer: [
      'Transfer times vary depending on the source network, destination network, selected provider, and network congestion. Ethereum-related transfers may take longer due to confirmation times.',
      'The Main Bridge interface provides transaction status updates during the bridging process.',
    ],
  },
  {
    id: 'trackmainbridge',
    question: 'Can I track the status of my bridge transaction?',
    answer: [
      'The Main Bridge interface provides information about your bridge transaction in the History tab.',
      'Some providers may also provide additional transaction tracking through their own explorers.',
    ],
  },
  {
    id: 'whybridgefailed',
    question: 'Why did my bridge transaction fail?',
    answer: [
      'Common reasons include: insufficient native gas tokens, an unsupported route, bridge limits exceeded, a wallet/network mismatch, or temporary provider or relay delays.',
      'If a transaction appears delayed, funds may still be processing through the bridge infrastructure.',
    ],
  },
  {
    id: 'arefundssafe',
    question: 'Are my funds safe during bridging?',
    answer: [
      'Bridge transactions go through multiple verification and relay steps before completion.',
      'Before bridging: verify the selected source and destination networks, ensure your wallet supports the destination network, make sure you have enough native gas tokens, and review the estimated fees before confirming the transaction.',
      'Always double-check the selected route and destination network before submitting a transaction.',
    ],
  },
]
